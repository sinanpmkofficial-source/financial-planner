/**
 * Money handling.
 *
 * All monetary values are stored and computed as **integer minor units**
 * (paise — 1 rupee = 100 paise) everywhere server-side and in the database.
 * This avoids floating-point drift when summing/subtracting amounts.
 *
 * The ONLY place "rupees" (major units, possibly fractional) exist is at the
 * form-input boundary: convert rupees -> paise on submit with `toPaise`, and
 * paise -> rupees with `toRupees` when pre-filling an edit form. Display goes
 * through `formatCurrency`, which converts paise -> rupees for the user.
 */

/** Convert a user-entered rupee amount into integer paise for storage. */
export function toPaise(rupees: number): number {
  if (!Number.isFinite(rupees)) return 0;
  return Math.round(rupees * 100);
}

/** Convert stored integer paise back into a rupee amount (for form inputs). */
export function toRupees(paise: number): number {
  if (!Number.isFinite(paise)) return 0;
  return paise / 100;
}
