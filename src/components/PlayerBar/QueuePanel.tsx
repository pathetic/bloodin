import { useState } from "react";
import { useAudioPlayer } from "../../contexts/AudioPlayerContext";
import {
  IconPlaylist,
  IconMusic,
  IconGripVertical,
  IconX,
} from "@tabler/icons-react";
import ClickableArtists from "./ClickableArtists";

interface QueuePanelProps {
  isOpen: boolean;
  onClose: () => void;
  queueRef: React.RefObject<HTMLDivElement>;
  onArtistClick?: (artistId: string, artistName: string) => void;
}

const QueuePanel: React.FC<QueuePanelProps> = ({
  isOpen,
  onClose,
  queueRef,
  onArtistClick,
}) => {
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const audioPlayerContext = useAudioPlayer();
  // Force re-render when queue changes
  // const queueVersion = audioPlayerContext.queueVersion;

  if (!isOpen) {
    return null;
  }

  const queue = audioPlayerContext.getQueue();
  const stats = audioPlayerContext.getQueueStats();

  return (
    <div className="fixed bottom-24 right-6 z-50">
      <div
        ref={queueRef}
        className="backdrop-blur-xl bg-base-100/30 border border-white/10 rounded-xl shadow-2xl w-96 max-h-96 overflow-hidden flex flex-col"
      >
        {/* Static Header */}
        <div className="flex items-center justify-between border-b border-white/10 p-3 bg-base-100/20 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <h3 className="text-base-content font-medium flex items-center gap-2 text-sm">
              <IconPlaylist size={14} />
              Queue
            </h3>
            <span className="text-xs text-base-content/80">
              {stats.current}/{stats.total}
              {stats.manual > 0 && ` (+${stats.manual} manual)`}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10 text-base-content/60 hover:text-white transition-colors text-xs"
          >
            ✕
          </button>
        </div>

        {/* Queue Source Info */}
        {stats.source.type !== "none" && (
          <div className="px-3 py-2 bg-base-100/10 border-b border-white/5">
            <p className="text-xs text-base-content/60">
              Playing from{" "}
              <span className="text-base-content/30 font-medium">
                {stats.source.name || `${stats.source.type} ${stats.source.id}`}
              </span>
            </p>
          </div>
        )}

        {/* Scrollable Queue List */}
        <div className="flex-1 overflow-y-auto">
          {queue.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-base-content/50">
              <IconPlaylist size={32} className="mb-2 opacity-50" />
              <p className="text-sm">No songs in queue</p>
            </div>
          ) : (
            <div className="p-2 space-y-1">
              {queue.slice(0, 50).map((queueItem, index) => (
                <div
                  key={`${queueItem.song.id}-${index}`}
                  draggable="true"
                  onDragStart={(e) => {
                    console.log(`🔄 DRAG START: ${queueItem.song.title}`);
                    e.dataTransfer.setData("text/plain", queueItem.song.id);
                    e.dataTransfer.effectAllowed = "move";
                    setDraggedItem(queueItem.song.id);
                  }}
                  onDragEnd={(_e) => {
                    console.log(`🏁 DRAG END: ${queueItem.song.title}`);
                    setDraggedItem(null);
                    setDragOverIndex(null);
                  }}
                  onDragOver={(e) => {
                    e.preventDefault();
                    console.log(`🎯 DRAG OVER: ${queueItem.song.title}`);
                    if (draggedItem !== queueItem.song.id) {
                      e.dataTransfer.dropEffect = "move";
                      setDragOverIndex(index);
                    }
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    console.log(`📦 DROP: ${queueItem.song.title}`);
                    const droppedSongId = e.dataTransfer.getData("text/plain");

                    if (droppedSongId && droppedSongId !== queueItem.song.id) {
                      console.log(
                        `🔄 Reordering ${droppedSongId} to position ${index}`
                      );
                      audioPlayerContext.reorderQueue(droppedSongId, index);
                    }

                    setDraggedItem(null);
                    setDragOverIndex(null);
                  }}
                  className={`flex items-center space-x-2 p-2 rounded-lg border ${
                    draggedItem === queueItem.song.id
                      ? "opacity-50 bg-blue-500/20 border-blue-500"
                      : dragOverIndex === index &&
                        draggedItem !== queueItem.song.id
                      ? "bg-green-500/20 border-green-500"
                      : "bg-gray-500/10 border-gray-500/20 hover:bg-gray-500/20"
                  } cursor-grab`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (
                      queueItem.status === "manual" ||
                      queueItem.status === "auto"
                    ) {
                      audioPlayerContext.jumpToSong(queueItem.song.id);
                    }
                  }}
                >
                  {/* Drag Handle */}
                  <div
                    className={`w-6 h-6 flex-shrink-0 transition-all duration-200 flex items-center justify-center ${
                      queueItem.status !== "playing"
                        ? "cursor-grab opacity-50 group-hover:opacity-100 hover:text-white hover:scale-110"
                        : "opacity-20 cursor-not-allowed"
                    } ${
                      draggedItem === queueItem.song.id
                        ? "opacity-100 text-green-400 animate-pulse"
                        : ""
                    }`}
                  >
                    <IconGripVertical
                      size={14}
                      className={`transition-all duration-200 ${
                        draggedItem === queueItem.song.id
                          ? "text-green-400"
                          : "text-base-content/60 group-hover:text-base-content/50"
                      } ${
                        queueItem.status !== "playing"
                          ? "group-hover:drop-shadow-lg"
                          : ""
                      }`}
                    />
                  </div>

                  {/* Song Info */}
                  <div className="w-6 h-6 flex-shrink-0">
                    {queueItem.song.albumArt ? (
                      <img
                        src={queueItem.song.albumArt}
                        alt={queueItem.song.title}
                        className="w-6 h-6 rounded object-cover"
                      />
                    ) : (
                      <div className="w-6 h-6 bg-gradient-to-br from-gray-500 to-gray-700 rounded flex items-center justify-center">
                        <IconMusic size={10} className="text-white" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4
                      className={`font-medium truncate text-xs ${
                        queueItem.status === "playing"
                          ? "text-red-500"
                          : "text-base-content"
                      }`}
                    >
                      {queueItem.song.title}
                    </h4>
                    <p className="text-xs text-base-content/60 truncate">
                      <ClickableArtists
                        artistString={queueItem.song.artist}
                        artistIds={queueItem.song.artistIds}
                        onArtistClick={onArtistClick}
                      />
                    </p>
                  </div>

                  {/* Status & Remove Button */}
                  <div className="flex items-center space-x-1">
                    {queueItem.status === "playing" && (
                      <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse mr-[0.4rem]"></div>
                    )}
                    {queueItem.status === "manual" && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full mr-[0.4rem]"></div>
                    )}

                    {queueItem.status !== "playing" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();

                          // Add visual feedback
                          const button = e.currentTarget;
                          button.style.transform = "scale(0.9)";
                          setTimeout(() => {
                            button.style.transform = "scale(1)";
                          }, 100);

                          // Remove from queue
                          const success = audioPlayerContext.removeFromQueue(
                            queueItem.song.id
                          );

                          if (success) {
                            console.log(
                              `🗑️ Removed "${queueItem.song.title}" from queue`
                            );
                          }
                        }}
                        className="p-1 rounded hover:bg-red-500/20 text-base-content/60 hover:text-red-400 transition-all duration-200 opacity-70 hover:opacity-100 group-hover:opacity-100"
                        title={`Remove "${queueItem.song.title}" from queue`}
                      >
                        <IconX size={12} />
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {queue.length > 50 && (
                <div className="p-2 text-center">
                  <p className="text-xs text-base-content/50">
                    ... and {queue.length - 50} more songs
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Queue Actions */}
        <div className="border-t border-white/10 p-3 bg-base-100/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => {
                  audioPlayerContext.clearQueue();
                }}
                className="cursor-pointer text-xs px-2 py-1 rounded bg-red-500/20 text-white hover:bg-red-500/30 transition-colors"
              >
                Clear All
              </button>
            </div>
            <div className="text-xs text-base-content/60">
              Click to play • Drag to reorder • X to remove
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QueuePanel;
