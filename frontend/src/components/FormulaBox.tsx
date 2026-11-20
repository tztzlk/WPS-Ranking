import { BlockMath } from 'react-katex';

/**
 * Renders the WPS formula in a bordered, centered math card.
 * Matches backend WPS v2 (backend/src/types/index.ts): per-event score from the rank relative to
 * the size of the field, summed over all events, MAX = sum of all weights.
 */
export function FormulaBox() {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-600 bg-gray-800/80 px-3 py-4 text-[0.8rem] sm:p-6 sm:text-base">
      <div className="space-y-2 sm:space-y-4">
        <BlockMath math="\text{EventScore}(e) = w_e \cdot \left(1 - \frac{\ln R_e}{\ln(N_e + 1)}\right)" />
        <BlockMath math="\text{WPS} = \frac{\sum_e \text{EventScore}(e)}{\text{MAX}} \cdot 100" />
        <BlockMath math="\text{MAX} = \sum_e w_e" />
      </div>
    </div>
  );
}
