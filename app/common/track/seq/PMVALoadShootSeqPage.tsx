import type {TrackScreenProps} from "~/routes/track/track-home-page.tsx";
import TrackNav from "~/common/track/TrackNav.tsx";
import {useCallback, useEffect, useRef, useState} from "react";
import {recordEvent} from "~/common/storage/track.ts";
import {getScoutingSession} from "~/common/storage/track.ts";
import {getMatchVideosByMatch, addMatchVideo} from "~/common/storage/rb.ts";
import type {MatchVideo} from "~/types/MatchVideo.ts";
import {useTrackNav} from "~/common/track/TrackNavContext.tsx";

// ---------------------------------------------------------------------------
// YouTube IFrame API types
// ---------------------------------------------------------------------------

declare global {
  interface Window {
    YT: {
      Player: new (
        el: string | HTMLElement,
        config: {
          videoId: string;
          playerVars?: Record<string, unknown>;
          events?: {
            onReady?: (e: { target: YTPlayer }) => void;
          };
        },
      ) => YTPlayer;
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  setPlaybackRate(rate: number): void;
  getPlaybackRate(): number;
  destroy(): void;
}

function loadYTApi(): Promise<void> {
  if (window.YT) return Promise.resolve();
  return new Promise((resolve) => {
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    window.onYouTubeIframeAPIReady = () => resolve();
    document.head.appendChild(tag);
  });
}

function extractYouTubeId(url: string): string | null {
  const m =
    url.match(/youtube\.com\/watch\?v=([^&]+)/) ||
    url.match(/youtu\.be\/([^?]+)/) ||
    url.match(/youtube\.com\/live\/([^?]+)/);
  return m ? m[1] : null;
}

// ---------------------------------------------------------------------------
// Video Panel
// ---------------------------------------------------------------------------

function VideoPanel({
  videos,
  onAddVideo,
  controlsOnly = false,
  videoOnly = false,
}: {
  videos: MatchVideo[];
  onAddVideo: (label: string, url: string) => void;
  controlsOnly?: boolean;
  videoOnly?: boolean;
}) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(0.25);
  const [showAdd, setShowAdd] = useState(false);
  const [addLabel, setAddLabel] = useState("Full Field");
  const [addUrl, setAddUrl] = useState("");
  const playerRef = useRef<YTPlayer | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeVideo = videos[activeIdx] ?? null;
  const videoId = activeVideo ? extractYouTubeId(activeVideo.videoUrl) : null;

  useEffect(() => {
    if (!videoId || !containerRef.current) return;
    let destroyed = false;

    loadYTApi().then(() => {
      if (destroyed) return;
      // Clear previous player
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
      // Need a fresh div for YT player
      if (containerRef.current) {
        containerRef.current.innerHTML = '<div id="pmva-yt-player"></div>';
      }
      playerRef.current = new window.YT.Player("pmva-yt-player", {
        videoId,
        playerVars: { autoplay: 0, rel: 0, modestbranding: 1 },
        events: {
          onReady: (e) => {
            e.target.setPlaybackRate(speed);
          },
        },
      });
    });

    return () => {
      destroyed = true;
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [videoId]);

  const handlePlay = () => {
    playerRef.current?.playVideo();
    setPlaying(true);
  };
  const handlePause = () => {
    playerRef.current?.pauseVideo();
    setPlaying(false);
  };
  const handleSpeed = (rate: number) => {
    setSpeed(rate);
    playerRef.current?.setPlaybackRate(rate);
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (addUrl.trim()) {
      onAddVideo(addLabel, addUrl.trim());
      setAddUrl("");
      setShowAdd(false);
    }
  };

  if (videoOnly) {
    return (
      <div className="pmva-video-main">
        <div className="pmva-video-container" ref={containerRef}>
          {!videoId && (
            <p className="pmva-video-empty">No video available for this match.</p>
          )}
        </div>
      </div>
    );
  }

  if (controlsOnly) {
    return (
      <div className="pmva-video-controls-column">
        {videos.length > 0 && (
          <div className="pmva-video-tabs-col">
            {videos.map((v, i) => (
              <button
                key={v.id}
                className={`pmva-ctrl-btn ${i === activeIdx ? "active" : ""}`}
                onClick={() => setActiveIdx(i)}
              >
                {v.label}
              </button>
            ))}
          </div>
        )}
        {videoId && (
          <>
            <button onClick={playing ? handlePause : handlePlay} className="pmva-ctrl-btn">
              {playing ? "Pause" : "Play"}
            </button>
            {[0.25, 0.5, 1, 2].map((rate) => (
              <button
                key={rate}
                className={`pmva-ctrl-btn ${speed === rate ? "active" : ""}`}
                onClick={() => handleSpeed(rate)}
              >
                {rate}x
              </button>
            ))}
          </>
        )}
        <div className="pmva-video-add-area">
          {showAdd ? (
            <form onSubmit={handleAddSubmit} className="pmva-video-add-form-col">
              <select value={addLabel} onChange={(e) => setAddLabel(e.target.value)}>
                <option>Full Field</option>
                <option>Standard</option>
                <option>Other</option>
              </select>
              <input
                type="url"
                placeholder="YouTube URL..."
                value={addUrl}
                onChange={(e) => setAddUrl(e.target.value)}
              />
              <button type="submit" disabled={!addUrl.trim()}>Add</button>
              <button type="button" onClick={() => setShowAdd(false)}>Cancel</button>
            </form>
          ) : (
            <button className="pmva-video-add-btn" onClick={() => setShowAdd(true)}>
              + Add Video
            </button>
          )}
        </div>
      </div>
    );
  }

  // Full panel (non-video-mode fallback, not currently used)
  return (
    <div className="pmva-video-panel">
      <div className="pmva-video-container" ref={containerRef}>
        {!videoId && <p className="pmva-video-empty">No video available.</p>}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// PMVA Form
// ---------------------------------------------------------------------------

const PMVALoadShootSeqPage = ({}: TrackScreenProps) => {
    const {goBack} = useTrackNav();
    const [videoMode, setVideoMode] = useState(false);
    const [videos, setVideos] = useState<MatchVideo[]>([]);
    const [hopperFilled, setHopperFilled] = useState<boolean | undefined>(undefined);
    const [loadNotes, setLoadNotes] = useState<string | undefined>(undefined);
    const [scoreCount, setScoreCount] = useState<number>(0);
    const [missCount, setMissCount] = useState<number>(0);
    const [unloadSeconds, setUnloadSeconds] = useState<number>(-1);
    const [stuckFuelCount, setStuckFuelCount] = useState<number>(-1);
    const [unloadComments, setUnloadComments] = useState<string | undefined>(undefined);

    enum ShootPosition { close, mid, far };
    const [shootPosition, setShootPosition] = useState<ShootPosition | undefined>(undefined);
    const [movingWhileShooting, setMovingWhileShooting] = useState<boolean | undefined>(undefined);
    const [shootingWhileIntaking, setShootingWhileIntaking] = useState<boolean | undefined>(undefined);

    // Load videos for current match
    const loadVideos = useCallback(() => {
        try {
            const session = getScoutingSession();
            getMatchVideosByMatch(session.tournamentId, session.level, session.matchId)
                .then(setVideos);
        } catch { /* not in a session */ }
    }, []);

    useEffect(() => { loadVideos(); }, [loadVideos]);

    const handleAddVideo = (label: string, url: string) => {
        try {
            const session = getScoutingSession();
            addMatchVideo(session.tournamentId, session.level, session.matchId, label, url)
                .then((ok) => { if (ok) loadVideos(); });
        } catch { /* ignore */ }
    };

    const isIncomplete: () => boolean = () => {
        if (hopperFilled === undefined) return true;
        if (unloadSeconds === -1) return true;
        if (stuckFuelCount === -1) return true;
        if (shootPosition === undefined) return true;
        if (movingWhileShooting === undefined) return true;
        if (shootingWhileIntaking === undefined) return true;
        return false
    }

    const handleSubmit = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        if (hopperFilled) {
            await recordEvent('pmva-load-hopper-full')
        } else {
            await recordEvent('pmva-load-hopper-not-full')
        }
        if (loadNotes) {
            await recordEvent('pmva-load-comments', -1, loadNotes)
        }
        await recordEvent('pmva-load', scoreCount + missCount + stuckFuelCount)
        await recordEvent("pmva-shoot", scoreCount + missCount)
        await recordEvent("pmva-shoot-score", scoreCount);
        await recordEvent("pmva-shoot-miss", missCount);
        await recordEvent("pmva-shoot-time", unloadSeconds);
        await recordEvent("pmva-shoot-stuck-in-hopper", stuckFuelCount);
        if (unloadComments) {
            await recordEvent("pmva-shoot-note", -1, unloadComments)
        }
        if (shootPosition === ShootPosition.close) {
            await recordEvent("pmva-shoot-close")
        } else if (shootPosition === ShootPosition.mid) {
            await recordEvent("pmva-shoot-mid")
        } else if (shootPosition === ShootPosition.far) {
            await recordEvent("pmva-shoot-far")
        }
        if (movingWhileShooting) {
            await recordEvent("pmva-shoot-moving");
        }
        if (shootingWhileIntaking) {
            await recordEvent("pmva-shoot-intaking");
        }
        await recordEvent("pmva-shoot-end");
        goBack();
    }

    return <main className={`track pmva ${videoMode ? "pmva-video-mode" : ""}`}>
        {videoMode && (
            <div className="pmva-video-top">
                <div className="pmva-video-sidebar">
                    <VideoPanel
                        videos={videos}
                        onAddVideo={handleAddVideo}
                        controlsOnly
                    />
                </div>
                <VideoPanel
                    videos={videos}
                    onAddVideo={handleAddVideo}
                    videoOnly
                />
            </div>
        )}
        <div className={videoMode ? "pmva-form-scroll" : ""}>
            {!videoMode && <TrackNav/>}
            <div className="pmva-header">
                <h2>Post-Match Video Analysis — Pickup, Score & Shoot Sequence</h2>
                <button
                    className="pmva-video-toggle"
                    onClick={() => setVideoMode((v) => !v)}
                >
                    {videoMode ? "Hide Video" : "Video"}
                </button>
            </div>

            <div className="pmva-form">
                <div className="pmva-form-row">
                    <label>Was the hopper filled?<span className="pmva-required">*</span></label>
                    <div className="pmva-btn-group">
                        <button onClick={() => setHopperFilled(true)}
                                disabled={hopperFilled}>Yes
                        </button>
                        <button onClick={() => setHopperFilled(false)}
                                disabled={!(hopperFilled === undefined) && !hopperFilled}>No
                        </button>
                    </div>
                </div>

                <div className="pmva-form-row">
                    <label>Anything noteworthy about this load?</label>
                    <textarea onChange={(e) => setLoadNotes(e.target.value)}/>
                </div>

                <div className="pmva-form-row">
                    <label>Score / Miss count</label>
                    <p className="pmva-hint">
                        Play the video back slowly and get an accurate count for the sequence.
                    </p>
                    <div className="pmva-counter-row">
                        <button onClick={() => setScoreCount(scoreCount + 1)}>Score One</button>
                        <span className="pmva-counter-value">{scoreCount}</span>
                        <button onClick={() => setMissCount(missCount + 1)}>Miss One</button>
                        <span className="pmva-counter-value">{missCount}</span>
                        <span className="pmva-counter-pct">
                            {Math.round(100 * scoreCount / Math.max(1, scoreCount + missCount))}%
                        </span>
                    </div>
                </div>

                <div className="pmva-form-row">
                    <label>How long did it take to unload? (seconds)<span className="pmva-required">*</span></label>
                    <p className="pmva-hint">
                        Rewind the video and play the sequence back. Use either the video time or a stopwatch.
                    </p>
                    <input type="number" min={0} max={155}
                           onChange={(e) => setUnloadSeconds(Number(e.target.value))}/>
                </div>

                <div className="pmva-form-row">
                    <label>How much fuel was stuck after the sequence?<span className="pmva-required">*</span></label>
                    <input type="number" min={0} max={50}
                           onChange={(e) => setStuckFuelCount(Number(e.target.value))}/>
                </div>

                <div className="pmva-form-row">
                    <label>Anything noteworthy about this shooting session?</label>
                    <textarea onChange={(e) => setUnloadComments(e.target.value)}/>
                </div>

                <div className="pmva-form-row">
                    <label>Where was the robot while shooting?<span className="pmva-required">*</span></label>
                    <div className="pmva-btn-group">
                        <button disabled={shootPosition === ShootPosition.close}
                                onClick={() => setShootPosition(ShootPosition.close)}>Close
                        </button>
                        <button disabled={shootPosition === ShootPosition.mid}
                                onClick={() => setShootPosition(ShootPosition.mid)}>Mid
                        </button>
                        <button disabled={shootPosition === ShootPosition.far}
                                onClick={() => setShootPosition(ShootPosition.far)}>Far
                        </button>
                    </div>
                </div>

                <div className="pmva-form-row">
                    <label>Was the robot moving while shooting?<span className="pmva-required">*</span></label>
                    <div className="pmva-btn-group">
                        <button disabled={movingWhileShooting}
                                onClick={() => setMovingWhileShooting(true)}>Moving
                        </button>
                        <button disabled={!(movingWhileShooting === undefined) && !movingWhileShooting}
                                onClick={() => setMovingWhileShooting(false)}>Still
                        </button>
                    </div>
                </div>

                <div className="pmva-form-row">
                    <label>Was the robot shooting while intaking during this sequence?<span
                        className="pmva-required">*</span></label>
                    <div className="pmva-btn-group">
                        <button disabled={shootingWhileIntaking}
                                onClick={() => setShootingWhileIntaking(true)}>Yes
                        </button>
                        <button disabled={!(shootingWhileIntaking === undefined) && !shootingWhileIntaking}
                                onClick={() => setShootingWhileIntaking(false)}>No
                        </button>
                    </div>
                </div>

                <div className="pmva-form-actions">
                    <button disabled={isIncomplete()} onClick={e => handleSubmit(e)}>Save Sequence</button>
                </div>
            </div>
        </div>
    </main>
}

export default PMVALoadShootSeqPage;
