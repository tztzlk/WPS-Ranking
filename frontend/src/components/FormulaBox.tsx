import { BlockMath } from 'react-katex';

/**
 * Renders the WPS formula in a bordered, centered math card.
 * Matches backend WPS v2 (backend/src/types/index.ts): per-event score from the rank relative to
 * the size of the field, summed over all events, MAX = sum of all weights.
 */
export function FormulaBox() {
  return (
    <div className="border border-gray-600 rounded-lg p-6 bg-gray-800/80 text-center overflow-x-auto">
      <div className="flex flex-col items-center gap-4">
        <BlockMath math="\text{EventScore}(e) = w_e \cdot \left(1 - \frac{\ln R_e}{\ln(N_e + 1)}\right)" />
        <BlockMath math="\text{WPS} = \frac{\sum_e \text{EventScore}(e)}{\text{MAX}} \cdot 100" />
        <BlockMath math="\text{MAX} = \sum_e w_e" />
      </div>
    </div>
  );
}
