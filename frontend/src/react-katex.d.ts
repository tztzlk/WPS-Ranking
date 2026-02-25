declare module 'react-katex' {
  import { FC } from 'react';
  interface BlockMathProps {
    math: string;
  }
  export const BlockMath: FC<BlockMathProps>;
  export const InlineMath: FC<BlockMathProps>;
}
