import {
  getViewWidthByViewportWidth,
  getViewHeightByViewportHeight,
  ViewWidth,
  SizeType,
  AdaptivityProps,
} from "@vkontakte/vkui";

interface Adaptivity {
  type: "adaptive" | "force_mobile" | "force_mobile_compact";
  viewportWidth: number;
  viewportHeight: number;
}

type TransformedAdaptivity = Pick<
  AdaptivityProps,
  "viewWidth" | "viewHeight" | "sizeX" | "sizeY"
>;

export const transformVKBridgeAdaptivity = (
  adaptivity: Adaptivity,
): TransformedAdaptivity => {
  const { type, viewportWidth, viewportHeight } = adaptivity;

  switch (type) {
    case "adaptive":
      return {
        viewWidth: getViewWidthByViewportWidth(viewportWidth),
        viewHeight: getViewHeightByViewportHeight(viewportHeight),
      };
    case "force_mobile":
    case "force_mobile_compact":
      return {
        viewWidth: ViewWidth.MOBILE,
        sizeX: SizeType.COMPACT,
        sizeY:
          type === "force_mobile_compact" ? SizeType.COMPACT : SizeType.REGULAR,
      };
    default:
      return {};
  }
};
