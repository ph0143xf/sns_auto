import { AbsoluteFill, Sequence, Video, useVideoConfig, staticFile } from "remotion";

// 字幕データ: [開始フレーム, 表示フレーム数, テキスト]
const CAPTIONS: [number, number, string][] = [
  [0,   90,  "産まれる前はね、"],
  [90,  150, "赤ちゃんが寝たら私も寝ようと思ってた。"],
  [270, 90,  "でも現実は違った。"],
  [390, 60,  "寝たら洗濯。"],
  [450, 60,  "寝たら掃除。"],
  [510, 90,  "寝たら仕事。"],
  [630, 90,  "そして気づく。"],
  [750, 150, '"あれ、私いつ寝るんだっけ？"'],
  [960, 90,  "でも今日も、"],
  [1080, 180, "この笑顔ひとつで全部許しちゃう"],
];

export const CaptionVideo: React.FC = () => {
  const { durationInFrames } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* ベース動画 */}
      <Video src={staticFile("source.mp4")} />

      {/* 字幕レイヤー */}
      {CAPTIONS.map(([from, dur, text], i) => (
        <Sequence key={i} from={from} durationInFrames={dur}>
          <AbsoluteFill
            style={{
              justifyContent: "flex-end",
              alignItems: "center",
              paddingBottom: 80,
              pointerEvents: "none",
            }}
          >
            <div
              style={{
                color: "#ffffff",
                fontSize: 36,
                fontFamily:
                  '"Hiragino Sans", "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif',
                fontWeight: 700,
                textAlign: "center",
                lineHeight: 1.5,
                padding: "12px 24px",
                maxWidth: "85%",
                textShadow: [
                  "0 2px 8px rgba(0,0,0,0.9)",
                  "0 0px 2px rgba(0,0,0,1)",
                  "2px 0px 2px rgba(0,0,0,1)",
                  "-2px 0px 2px rgba(0,0,0,1)",
                ].join(", "),
                whiteSpace: "pre-wrap",
                wordBreak: "break-all",
              }}
            >
              {text}
            </div>
          </AbsoluteFill>
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
