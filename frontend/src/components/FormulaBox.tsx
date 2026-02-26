import { BlockMath } from 'react-katex';

/**
 * Renders the WPS formula in a bordered, centered math card.
 * Matches backend: EventScore(e) = w_e · (1/ln(R_e+1)) · 10, WPS = (Σ/MAX)·100, MAX = Σ (w_e·(1/ln(2))·10).
 */
export function FormulaBox() {
  return (
    <div className="border border-gray-600 rounded-lg p-6 bg-gray-800/80 text-center overflow-x-auto">
      <div className="flex flex-col items-center gap-4">
        <BlockMath math="\text{EventScore}(e) = w_e \cdot \frac{1}{\ln(R_e + 1)} \cdot 10" />
        <BlockMath math="\text{WPS} = \frac{\sum \text{EventScore}(e)}{\text{MAX}} \cdot 100" />
        <BlockMath math="\text{MAX} = \sum \left( w_e \cdot \frac{1}{\ln(2)} \cdot 10 \right)" />
      </div>
    </div>
  );
}
