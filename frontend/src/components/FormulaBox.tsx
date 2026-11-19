import { BlockMath } from 'react-katex';

/**
 * Renders the WPS formula in a bordered, centered math card.
 * Matches backend WPS v2 (backend/src/types/index.ts): per-event score from the rank relative to
 * the size of the field, best 5 events count, MAX = sum of the 5 highest weights.
 */
export function FormulaBox() {
  return (
    <div className="border border-gray-600 rounded-lg p-6 bg-gray-800/80 text-center overflow-x-auto">
      <div className="flex flex-col items-center gap-4">
        <BlockMath math="\text{EventScore}(e) = w_e \cdot \left(1 - \frac{\ln R_e}{\ln(N_e + 1)}\right)" />
        <BlockMath math="\text{WPS} = \frac{\sum_{\text{best 5 events}} \text{EventScore}(e)}{\text{MAX}} \cdot 100" />
        <BlockMath math="\text{MAX} = \text{sum of the 5 highest } w_e" />
      </div>
    </div>
  );
}
