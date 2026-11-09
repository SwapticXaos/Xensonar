export const ROOT_FOLLOW_GM_SIDE_BY_SIDE_LAYOUT = {
  leftOverlayClass: "justify-start bg-black/65 px-3 pb-3 pt-3",
  leftDialogClass: "h-[calc(100vh-1.5rem)] max-w-[64rem]",
  rightOverlayClass:
    "pointer-events-none items-start justify-end bg-transparent px-3 pb-3 pt-3",
  rightDialogClass: "pointer-events-auto h-[calc(100vh-1.5rem)] max-w-[42rem]",
  emptyLeftPositionClass:
    "items-start justify-start pl-[max(0.75rem,calc((100vw-88rem)/2+0.75rem))] pt-3",
} as const;
