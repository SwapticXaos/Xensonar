// Maps `import ... from "react"` onto the React namespace (P) that every room chunk of the app sees (room chunks are evaluated inside the bundle scope).
const R=P;export default R;
export const useState=R.useState,useEffect=R.useEffect,useMemo=R.useMemo,useRef=R.useRef,useCallback=R.useCallback,createElement=R.createElement,Fragment=R.Fragment,memo=R.memo,Suspense=R.Suspense,lazy=R.lazy;
