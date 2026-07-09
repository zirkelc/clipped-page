/** Font files are imported as raw bytes via wrangler's `Data` module rule. */
declare module '*.ttf' {
  const data: ArrayBuffer;
  export default data;
}
