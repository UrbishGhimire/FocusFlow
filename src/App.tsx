import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Auth } from './components/Auth';
import { ProfileSetup } from './components/ProfileSetup';
import { ProtocolSelector } from './components/ProtocolSelector';
import { GhostModeBar } from './components/GhostModeBar';
import { MicroPauseOverlay } from './components/MicroPauseOverlay';
import { MicroRestPrompt } from './components/MicroRestPrompt';
import { TroughRecovery } from './components/TroughRecovery';
import { PrimingScreen } from './components/PrimingScreen';
import { SessionComplete } from './components/SessionComplete';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { useTimerStore } from './stores/timerStore';
import { useWakeLock } from './hooks/useWakeLock';
import { useNotifications } from './hooks/useNotification';
import { BarChart3, Play, ArrowLeft } from 'lucide-react';
import { getUserProfileId, savePushSubscription, supabase } from './lib/supabase';
import UpdaterPrompt from './components/UpdaterPrompt';

type View = 'selector' | 'active' | 'analytics' | 'complete';

// Inner component that uses hooks – only rendered after hydration is true
function MainAppContent() {
  const {
    session,
    isHydrated,
    saveStatus,
    saveMessage,
    setSaveStatus,
    realtimeStatus,
    realtimeLastEventAt,
  } = useTimerStore();
  const { isHeld } = useWakeLock();
  const { user } = useAuth();
  const {
    isSupported,
    isPushSupported,
    ensurePushSubscription,
    pushSubscription,
  } = useNotifications();
  const [manualView, setManualView] = useState<View | null>(null);

  let derivedView: View;
  if (manualView !== null) {
    derivedView = manualView;
  } else if (!session) {
    derivedView = 'selector';
  } else if (session.status === 'completed' || session.status === 'aborted') {
    derivedView = 'complete';
  } else if (session.status === 'running' || session.status === 'paused') {
    derivedView = 'active';
  } else {
    derivedView = 'selector';
  }

  useEffect(() => {
    if (session?.status === 'completed' || session?.status === 'aborted' || !session) {
      setManualView(null);
    }
  }, [session?.status, session]);

  useEffect(() => {
    if (saveStatus === 'saved' || saveStatus === 'error') {
      const timeout = window.setTimeout(() => setSaveStatus('idle', null), 4000);
      return () => window.clearTimeout(timeout);
    }
    return undefined;
  }, [saveStatus, setSaveStatus]);

  useEffect(() => {
    if (!user || !pushSubscription) return;
    let isCancelled = false;

    const storeSubscription = async () => {
      const profileId = await getUserProfileId(user.id);
      if (!profileId || isCancelled) return;
      const { error } = await savePushSubscription(profileId, pushSubscription);
      if (error) {
        console.error('[Push] Save subscription failed', error);
      }
    };

    storeSubscription();
    return () => {
      isCancelled = true;
    };
  }, [user, pushSubscription]);

  const renderView = () => {
    switch (derivedView) {
      case 'selector':
        return <ProtocolSelector />;
      case 'analytics':
        return <AnalyticsDashboard />;
      case 'complete':
        return <SessionComplete />;
      case 'active':
        return (
          <>
            <GhostModeBar />
            <PrimingScreen />
            <TroughRecovery />
            <MicroRestPrompt />
            <MicroPauseOverlay />
            <div className="pt-24 px-6 pb-6 min-h-screen flex items-center justify-center">
              <div className="text-center space-y-4">
                <p className="text-slate-600 text-sm uppercase tracking-widest">Deep Work Zone</p>
                <p className="text-slate-500 text-xs max-w-xs mx-auto">
                  Keep this app visible. The timer runs in the Ghost Mode bar above.
                  {session?.protocol === 'dive' && ' Micro-pauses will appear as subtle overlays.'}
                </p>
                <button
                  onClick={() => setManualView('analytics')}
                  className="mt-4 px-4 py-2 rounded-lg bg-slate-800 text-slate-400 text-xs hover:bg-slate-700 transition-colors flex items-center gap-2 mx-auto"
                >
                  <BarChart3 className="w-3 h-3" />
                  View Analytics
                </button>
              </div>
            </div>
          </>
        );
    }
  };

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  const showNav = !session || derivedView === 'analytics' || derivedView === 'complete' || derivedView === 'selector';

  const lastEventAge = realtimeLastEventAt ? Math.max(0, Math.floor((Date.now() - realtimeLastEventAt) / 1000)) : null;

  const handlePushSubscribe = async () => {
    try {
      const sub = await ensurePushSubscription();
      if (sub) {
        console.log('[Push] Subscribed', sub.toJSON());
      } else {
        console.warn('[Push] Subscription not created');
      }
    } catch (error) {
      console.error('[Push] Subscription error', error);
    }
  };


  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="fixed bottom-2 right-2 z-[70] text-[10px] text-slate-700 font-mono">
        {isHeld ? '🔒 Wake Lock' : '🔓 No Wake Lock'} | 
        {isSupported ? '🔔 Notifications' : '🔕 No Notifications'} |
        Push:{pushSubscription ? 'on' : 'off'} |
        RT:{realtimeStatus}{lastEventAge !== null ? ` (${lastEventAge}s)` : ''} |
        {derivedView.toUpperCase()} |
        v0.1.0
        {/* Dev test button removed; native notifications verified */}
        {isPushSupported && !pushSubscription && (
          <button
            onClick={handlePushSubscribe}
            className="ml-2 px-1.5 py-0.5 rounded border border-slate-700 text-[9px] text-slate-500 hover:text-slate-300 hover:border-slate-500"
          >
            Subscribe
          </button>
        )}
      </div>

      {saveStatus !== 'idle' && (
        <div className="fixed bottom-2 left-2 z-[70] text-xs">
          <div
            className={`px-3 py-2 rounded-lg border backdrop-blur-sm shadow-lg ${
              saveStatus === 'saving'
                ? 'bg-slate-900/80 border-slate-700 text-slate-300'
                : saveStatus === 'saved'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            {saveMessage || (saveStatus === 'saving' ? 'Saving...' : saveStatus === 'saved' ? 'Saved' : 'Save failed')}
          </div>
        </div>
      )}

      {showNav && (
        <nav className="fixed top-0 left-0 right-0 z-40 bg-slate-900/80 backdrop-blur-sm border-b border-slate-800 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="font-bold text-slate-200">FocusFlow</span>
          </div>
          <div className="flex items-center gap-2">
            {session && (session.status === 'running' || session.status === 'paused') && derivedView !== 'active' && (
              <button
                onClick={() => setManualView('active')}
                className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3 h-3" />
                Back to Session
              </button>
            )}
            <button
              onClick={() => setManualView('selector')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                derivedView === 'selector' ? 'bg-slate-800 text-slate-200' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <Play className="w-3 h-3 inline mr-1" />
              Session
            </button>
            <button
              onClick={() => setManualView('analytics')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                derivedView === 'analytics' ? 'bg-slate-800 text-slate-200' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              <BarChart3 className="w-3 h-3 inline mr-1" />
              Analytics
            </button>
          </div>
        </nav>
      )}

      <div className={showNav ? 'pt-14' : ''}>
        {renderView()}
      </div>
    </div>
  );
}

// Wrapper that checks if user has a profile
function AuthenticatedApp() {
  const { user, isLoading: authLoading } = useAuth();
  const { startRealtimeSync, stopRealtimeSync } = useTimerStore();
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [checkingProfile, setCheckingProfile] = useState(true);

  useEffect(() => {
    if (!user) return;
    const checkProfile = async () => {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('auth_user_id', user.id)
        .maybeSingle();
      if (error) console.error('Profile check error:', error);
      setHasProfile(!!data);
      setCheckingProfile(false);
    };
    checkProfile();
  }, [user]);

  useEffect(() => {
    if (user && hasProfile) {
      startRealtimeSync();
    }
    return () => {
      stopRealtimeSync();
    };
  }, [user?.id, hasProfile, startRealtimeSync, stopRealtimeSync]);

  if (authLoading || checkingProfile) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  if (!user) return null;

  if (!hasProfile) {
    return <ProfileSetup onComplete={() => setHasProfile(true)} />;
  }

  return <MainAppContent />;
}

// Top-level: AuthProvider then decide auth vs main
function App() {
  const { session: authSession, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  if (!authSession) {
    return <Auth />;
  }

  return <AuthenticatedApp />;
}

export default function Root() {
  return (
    <AuthProvider>
      <App />
      <UpdaterPrompt />
    </AuthProvider>
  );
}