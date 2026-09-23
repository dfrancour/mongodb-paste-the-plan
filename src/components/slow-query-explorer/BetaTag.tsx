import { Tooltip } from "#components/common/Tooltip";

export function BetaTag() {
  return (
    <Tooltip content="Feature in beta. This was developed for a particular investigation and needs work.">
      <span className="badge-info cursor-default font-normal">Beta</span>
    </Tooltip>
  );
}
