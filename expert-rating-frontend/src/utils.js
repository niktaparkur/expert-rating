export const transformVKBridgeAdaptivity = ({
  type,
  viewportWidth,
  viewportHeight,
}) => {
  switch (type) {
    case 'adaptive':
      return {
        viewWidth: viewportWidth,
        viewHeight: viewportHeight,
      };
    case 'force_mobile':
    case 'force_mobile_compact':
      return {
        viewWidth: 320,
        sizeX: 'compact',
        sizeY: 'regular',
      };
    default:
      return {};
  }
};