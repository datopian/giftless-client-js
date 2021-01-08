/**
 * Wrapper around File.hash that logs progress to console
 *
 * @param {File} file
 * @param {String} algorithm
 * @returns {Promise<*>}
 * @private
 */
async function getFileHash(file, algorithm) {
  return file.hash(algorithm, (progressPct) => {
    if (progressPct % 25 === 0) {
      console.log('Calculating hash is ' + progressPct + '% done')
    }
  });
}

export { getFileHash }