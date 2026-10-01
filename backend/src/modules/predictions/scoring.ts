/** Points for a score prediction: exact score 3, right winner and goal difference 2, right outcome 1. */
export function scorePrediction(pred: { homeScore: number; awayScore: number }, actual: { homeScore: number; awayScore: number }): number {
  if (pred.homeScore === actual.homeScore && pred.awayScore === actual.awayScore) return 3;
  const sign = (h: number, a: number) => Math.sign(h - a);
  if (sign(pred.homeScore, pred.awayScore) !== sign(actual.homeScore, actual.awayScore)) return 0;
  return pred.homeScore - pred.awayScore === actual.homeScore - actual.awayScore ? 2 : 1;
}

/** Public label for a user without exposing the email: "murasaki@…" -> "mu•••". */
export function maskEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  return `${local.slice(0, 2)}•••`;
}
