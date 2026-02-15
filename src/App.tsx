import { useState, useEffect, useRef } from 'react';
import { 
  Play, 
  Pause, 
  Film, 
  Music, 
  BookOpen, 
  BookText, 
  Image as ImageIcon, 
  Radio, 
  Download, 
  FolderOpen, 
  FileText, 
  Home, 
  BarChart3,
  Activity,
  Zap,
  Volume2
} from 'lucide-react';

// App definitions
const APPS = [
  { id: 'movies', name: 'Movies', subtitle: 'Jellyfin', icon: Film, color: 'from-purple-500 to-purple-600' },
  { id: 'music', name: 'Music', subtitle: 'Navidrome', icon: Music, color: 'from-green-500 to-green-600' },
  { id: 'audiobooks', name: 'Audiobooks', subtitle: 'Audiobookshelf', icon: BookOpen, color: 'from-orange-500 to-orange-600' },
  { id: 'ebooks', name: 'e-Books', subtitle: 'Kavita', icon: BookText, color: 'from-blue-500 to-blue-600' },
  { id: 'photos', name: 'Photos', subtitle: 'Immich', icon: ImageIcon, color: 'from-pink-500 to-pink-600' },
  { id: 'radio', name: 'Radio', subtitle: 'AzuraCast', icon: Radio, color: 'from-red-500 to-red-600' },
  { id: 'downloads', name: 'Downloads', subtitle: 'qBittorrent', icon: Download, color: 'from-cyan-500 to-cyan-600' },
  { id: 'files', name: 'File Browser', subtitle: 'Filebrowser', icon: FolderOpen, color: 'from-yellow-500 to-yellow-600' },
  { id: 'documents', name: 'Documents', subtitle: 'Paperless', icon: FileText, color: 'from-teal-500 to-teal-600' },
  { id: 'homebox', name: 'Home Inventory', subtitle: 'Homebox', icon: Home, color: 'from-indigo-500 to-indigo-600' },
  { id: 'jellystat', name: 'Movie Stats', subtitle: 'Jellystat', icon: BarChart3, color: 'from-violet-500 to-violet-600' },
];

interface NowPlayingData {
  isPlaying: boolean;
  song: {
    title: string;
    artist: string;
    album: string;
    art: string;
    duration: number;
    elapsed: number;
    remaining: number;
  } | null;
  listeners: number;
  streamUrl: string;
}

interface DownloadStats {
  dlSpeed: number;
  ulSpeed: number;
  activeTorrents: number;
  totalTorrents: number;
}

interface AppStatus {
  [key: string]: boolean;
}

function App() {
  const [nowPlaying, setNowPlaying] = useState<NowPlayingData>({
    isPlaying: false,
    song: null,
    listeners: 0,
    streamUrl: 'https://radio.sam9scloud.in/listen/sam9s.radio/radio.mp3'
  });
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [downloadStats, setDownloadStats] = useState<DownloadStats>({
    dlSpeed: 0,
    ulSpeed: 0,
    activeTorrents: 0,
    totalTorrents: 0
  });
  const [appStatus, setAppStatus] = useState<AppStatus>({});
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch AzuraCast now playing
  useEffect(() => {
    const fetchNowPlaying = async () => {
      try {
        const response = await fetch('https://radio.sam9scloud.in/api/nowplaying');
        const data = await response.json();
        if (data && data[0]) {
          const station = data[0];
          setNowPlaying({
            isPlaying: station.is_online,
            song: station.now_playing ? {
              title: station.now_playing.song.title,
              artist: station.now_playing.song.artist,
              album: station.now_playing.song.album || '',
              art: station.now_playing.song.art,
              duration: station.now_playing.duration,
              elapsed: station.now_playing.elapsed,
              remaining: station.now_playing.remaining
            } : null,
            listeners: station.listeners.current,
            streamUrl: station.station.listen_url
          });
          if (station.now_playing) {
            const percent = (station.now_playing.elapsed / station.now_playing.duration) * 100;
            setProgress(percent);
          }
        }
      } catch (error) {
        console.error('Failed to fetch now playing:', error);
      }
    };

    fetchNowPlaying();
    const interval = setInterval(fetchNowPlaying, 10000);
    return () => clearInterval(interval);
  }, []);

  // Fetch qBittorrent stats
  useEffect(() => {
    const fetchDownloads = async () => {
      try {
        const response = await fetch('/api/qbittorrent/stats');
        const data = await response.json();
        setDownloadStats({
          dlSpeed: data.speeds?.dl || 0,
          ulSpeed: data.speeds?.ul || 0,
          activeTorrents: data.torrents?.filter((t: any) => t.state === 'downloading').length || 0,
          totalTorrents: data.torrents?.length || 0
        });
      } catch (error) {
        console.error('Failed to fetch download stats:', error);
      }
    };

    fetchDownloads();
    const interval = setInterval(fetchDownloads, 30000);
    return () => clearInterval(interval);
  }, []);

  // Check app status
  useEffect(() => {
    const checkStatus = async (app: typeof APPS[0]) => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        await fetch(`https://${app.id === 'radio' ? 'radio' : app.id === 'movies' ? 'movies' : app.id === 'music' ? 'music' : app.id === 'audiobooks' ? 'abs' : app.id === 'ebooks' ? 'reader' : app.id === 'photos' ? 'photos' : app.id === 'downloads' ? 'downloads' : app.id === 'files' ? 'files' : app.id === 'documents' ? 'docs' : app.id === 'homebox' ? 'homebox' : 'jellystat'}.sam9scloud.in`, { 
          method: 'HEAD',
          signal: controller.signal,
          mode: 'no-cors'
        });
        clearTimeout(timeoutId);
        setAppStatus(prev => ({ ...prev, [app.id]: true }));
      } catch {
        setAppStatus(prev => ({ ...prev, [app.id]: false }));
      }
    };

    APPS.forEach(app => checkStatus(app));
    const interval = setInterval(() => {
      APPS.forEach(app => checkStatus(app));
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Update progress bar
  useEffect(() => {
    if (!nowPlaying.song) return;
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) return 0;
        return prev + (100 / nowPlaying.song!.duration);
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [nowPlaying.song]);

  const togglePlay = () => {
    if (!audioRef.current) {
      audioRef.current = new Audio(nowPlaying.streamUrl);
    }
    
    if (isPlayingAudio) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(console.error);
    }
    setIsPlayingAudio(!isPlayingAudio);
  };

  const formatSpeed = (bytes: number) => {
    if (bytes === 0) return '0 B/s';
    const k = 1024;
    const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-gray-200 p-6">
      {/* Header */}
      <header className="mb-8 flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-orange-500 rounded-lg flex items-center justify-center shadow-lg shadow-pink-500/20">
          <Zap className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Sam CloudboX Launchpad</h1>
          <p className="text-gray-500 text-sm">Rapid Automation Media Engineer</p>
        </div>
      </header>

      {/* Media Player & Downloads */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        {/* Now Playing */}
        <div className="lg:col-span-2 bg-[#161b22] rounded-xl p-4 border border-gray-800 shadow-xl">
          <div className="flex items-center gap-4">
            <button 
              onClick={togglePlay}
              className="w-12 h-12 bg-gradient-to-r from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700 rounded-full flex items-center justify-center transition-all shadow-lg shadow-pink-500/30"
            >
              {isPlayingAudio ? <Pause className="w-6 h-6 text-white" /> : <Play className="w-6 h-6 text-white ml-1" />}
            </button>
            
            {nowPlaying.song ? (
              <>
                <img 
                  src={nowPlaying.song.art} 
                  alt={nowPlaying.song.title}
                  className="w-14 h-14 rounded-lg object-cover shadow-lg"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white truncate">{nowPlaying.song.title}</h3>
                  <p className="text-gray-400 text-sm truncate">{nowPlaying.song.artist}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-pink-500 to-pink-400 transition-all duration-1000"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500">
                      {formatTime(nowPlaying.song.remaining)}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1">
                <p className="text-gray-500">Not playing</p>
              </div>
            )}
            
            <div className="flex items-center gap-2 text-gray-500">
              <Volume2 className="w-4 h-4" />
              <span className="text-sm">{nowPlaying.listeners} listeners</span>
            </div>
          </div>
        </div>

        {/* Download Stats */}
        <div className="bg-[#161b22] rounded-xl p-4 border border-gray-800 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2 text-white">
              <Download className="w-4 h-4 text-pink-500" />
              Now Downloading
            </h3>
            <Activity className="w-4 h-4 text-pink-500 animate-pulse" />
          </div>
          
          {downloadStats.activeTorrents > 0 ? (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Active:</span>
                <span className="text-white">{downloadStats.activeTorrents} / {downloadStats.totalTorrents}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Download:</span>
                <span className="text-green-400">{formatSpeed(downloadStats.dlSpeed)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Upload:</span>
                <span className="text-blue-400">{formatSpeed(downloadStats.ulSpeed)}</span>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Nothing downloading</p>
          )}
        </div>
      </div>

      {/* App Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {APPS.map((app) => {
          const Icon = app.icon;
          const isOnline = appStatus[app.id] ?? true;
          
          return (
            <a
              key={app.id}
              href={`https://${app.id === 'radio' ? 'radio' : app.id === 'movies' ? 'movies' : app.id === 'music' ? 'music' : app.id === 'audiobooks' ? 'abs' : app.id === 'ebooks' ? 'reader' : app.id === 'photos' ? 'photos' : app.id === 'downloads' ? 'downloads' : app.id === 'files' ? 'files' : app.id === 'documents' ? 'docs' : app.id === 'homebox' ? 'homebox' : 'jellystat'}.sam9scloud.in`}
              target="_blank"
              rel="noopener noreferrer"
              className="group bg-[#161b22] rounded-xl p-4 border border-gray-800 hover:border-pink-500/50 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl hover:shadow-pink-500/10"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${app.color} flex items-center justify-center shadow-lg`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
              </div>
              <h3 className="font-semibold text-white group-hover:text-pink-400 transition-colors">{app.name}</h3>
              <p className="text-gray-500 text-sm">{app.subtitle}</p>
            </a>
          );
        })}
      </div>

      {/* Footer */}
      <footer className="mt-12 text-center text-gray-600 text-sm">
        <p>Ramen Launchpad • Sam CloudboX • {new Date().getFullYear()}</p>
      </footer>
    </div>
  );
}

export default App;