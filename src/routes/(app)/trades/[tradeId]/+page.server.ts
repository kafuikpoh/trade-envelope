import { apiParsed, soft } from "#lib/server/api.js";
import {
  TradeOpportunity,
  Evaluation,
  FeeAgreement,
  Coverage,
  Reconcile,
} from "#lib/api/schemas.js";
import type { PageServerLoad } from "./$types";

const none = (e: any) => {
  if ([400, 404, 409].includes(e?.status)) return null;
  throw e;
};

export const load: PageServerLoad = async ({ params, cookies, fetch }) => {
  const id = params.tradeId;
  const opportunity = await apiParsed(
    fetch,
    cookies,
    "GET",
    `/trade-opportunities/${id}`,
    TradeOpportunity,
  );
  // Needs a buyer requirement and an active offer; results are never stored, so evaluate on every load.
  const canEvaluate =
    !!opportunity.buyer && opportunity.offers.some((o) => !o.isWithdrawn);
  const evaluations = canEvaluate
    ? ((await apiParsed(
        fetch,
        cookies,
        "POST",
        `/trade-opportunities/${id}/evaluate`,
        Evaluation,
      ).catch(none)) ?? [])
    : [];
  const agreement = await soft(
    fetch,
    cookies,
    "GET",
    `/trade-opportunities/${id}/fee-agreement`,
    FeeAgreement,
  );
  const [coverage, reconcile] =
    agreement && evaluations.length
      ? await Promise.all([
          soft(
            fetch,
            cookies,
            "GET",
            `/fee-agreements/${agreement.id}/coverage`,
            Coverage,
          ),
          soft(
            fetch,
            cookies,
            "POST",
            `/fee-agreements/${agreement.id}/reconcile`,
            Reconcile,
          ),
        ])
      : [null, null];
  return {
    tradeId: id,
    opportunity,
    evaluations,
    agreement,
    coverage: coverage ?? [],
    reconcile,
  };
};
