/**
 * The studio wordmark: «Po|eDance» over «K|seleva», where one gold vertical line —
 * the pole — stands for both the «l» and the «i», as in the studio logo.
 */
export function Wordmark({ className = '', large = false }: { className?: string; large?: boolean }) {
  return (
    <span className={`wordmark ${large ? 'wordmark--large' : ''} ${className}`} aria-label="Pole Dance Kiseleva" role="img">
      <span className="wordmark__l" aria-hidden="true">
        <span>Po</span>
        <span>K</span>
      </span>
      <span className="wordmark__pole" aria-hidden="true" />
      <span className="wordmark__r" aria-hidden="true">
        <span>eDance</span>
        <span>seleva</span>
      </span>
    </span>
  );
}
