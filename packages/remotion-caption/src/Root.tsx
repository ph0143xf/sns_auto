import { Composition } from "remotion";
import { CaptionVideo } from "./Caption";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="CaptionVideo"
      component={CaptionVideo}
      durationInFrames={1266}
      fps={30}
      width={720}
      height={1280}
    />
  );
};
