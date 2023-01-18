
/**
 *
 * Utility function which allows us to await a predicate condition before
 * proceeding with function execution.
 *
 */
export default function until(conditionFunction) {

  const poll = resolve => {
    if (conditionFunction()) resolve();
    else setTimeout(_ => poll(resolve), 400);
  }
  return new Promise(poll);
}
