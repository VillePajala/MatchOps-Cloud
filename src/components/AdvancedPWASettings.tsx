'use client';

import React, { useState, useEffect, useRef } from 'react';
import PushNotificationSettings from './PushNotificationSettings';
import { useDeviceIntegration } from '@/hooks/useDeviceIntegration';

interface AdvancedPWASettingsProps {
  className?: string;
}

export default function AdvancedPWASettings({ className = '' }: AdvancedPWASettingsProps) {
  const {
    capabilities,
    isFullscreen,
    wakeLock,
    shareContent,
    copyToClipboard,
    vibrate,
    toggleFullscreen,
    requestWakeLock,
    releaseWakeLock,
    getCurrentPosition,
    capturePhoto,
    getShareTemplates,
    error,
    clearError
  } = useDeviceIntegration();

  const [activeTab, setActiveTab] = useState<'notifications' | 'features' | 'sharing' | 'debug'>('notifications');
  const [testResults, setTestResults] = useState<Record<string, string>>({});
  const testTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Cleanup timeouts on unmount
  useEffect(() => {
    const timeouts = testTimeoutsRef.current;
    return () => {
      timeouts.forEach((timeoutId) => clearTimeout(timeoutId));
      timeouts.clear();
    };
  }, []);

  const addTestResult = (feature: string, result: string) => {
    // Clear existing timeout for this feature if any
    const existingTimeout = testTimeoutsRef.current.get(feature);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    setTestResults(prev => ({ ...prev, [feature]: result }));
    
    const timeoutId = setTimeout(() => {
      setTestResults(prev => {
        const newResults = { ...prev };
        delete newResults[feature];
        return newResults;
      });
      testTimeoutsRef.current.delete(feature);
    }, 3000);
    
    testTimeoutsRef.current.set(feature, timeoutId);
  };

  const handleTestVibration = () => {
    const success = vibrate([100, 50, 100, 50, 200]);
    addTestResult('vibration', success ? '✅ Vibration works!' : '❌ Vibration not supported');
  };

  const handleTestShare = async () => {
    const templates = getShareTemplates();
    const shareData = templates.appRecommendation();
    const success = await shareContent(shareData);
    addTestResult('share', success ? '✅ Sharing works!' : '❌ Sharing failed');
  };

  const handleTestClipboard = async () => {
    const success = await copyToClipboard('MatchOps Cloud - Plan • Track • Debrief');
    addTestResult('clipboard', success ? '✅ Copied to clipboard!' : '❌ Clipboard access failed');
  };

  const handleTestLocation = async () => {
    const position = await getCurrentPosition();
    if (position) {
      addTestResult('location', `✅ Location: ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`);
    } else {
      addTestResult('location', '❌ Location access failed');
    }
  };

  const handleTestCamera = async () => {
    const photo = await capturePhoto();
    addTestResult('camera', photo ? `✅ Photo captured (${Math.round(photo.size / 1024)}KB)` : '❌ Camera access failed');
  };

  const handleToggleWakeLock = async () => {
    if (wakeLock) {
      releaseWakeLock();
      addTestResult('wakeLock', '🔓 Wake lock released');
    } else {
      const success = await requestWakeLock();
      addTestResult('wakeLock', success ? '🔒 Wake lock active' : '❌ Wake lock failed');
    }
  };

  const getCapabilityIcon = (available: boolean) => available ? '✅' : '❌';
  const getCapabilityColor = (available: boolean) => available ? 'text-green-600' : 'text-red-500';

  const tabs = [
    { id: 'notifications', name: 'Notifications', icon: '🔔' },
    { id: 'features', name: 'Features', icon: '⚙️' },
    { id: 'sharing', name: 'Sharing', icon: '📤' },
    { id: 'debug', name: 'Debug', icon: '🔧' }
  ] as const;

  return (
    <div className={`bg-white rounded-lg border border-gray-200 overflow-hidden ${className}`}>
      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 px-4 py-3 text-sm font-medium text-center border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border-b border-red-200 p-3">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-red-500">❌</span>
              <span className="text-sm text-red-700">{error}</span>
            </div>
            <button
              onClick={clearError}
              className="text-red-400 hover:text-red-600 text-sm"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Tab Content */}
      <div className="p-6">
        {activeTab === 'notifications' && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Push Notifications</h3>
            <PushNotificationSettings />
          </div>
        )}

        {activeTab === 'features' && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Device Features</h3>
            
            {/* Device Capabilities Overview */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h4 className="font-medium text-gray-800 mb-3">Available Capabilities</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <div className="flex items-center gap-2">
                  <span>{getCapabilityIcon(capabilities.webShare)}</span>
                  <span className={`text-sm ${getCapabilityColor(capabilities.webShare)}`}>Web Share</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>{getCapabilityIcon(capabilities.clipboard)}</span>
                  <span className={`text-sm ${getCapabilityColor(capabilities.clipboard)}`}>Clipboard</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>{getCapabilityIcon(capabilities.camera)}</span>
                  <span className={`text-sm ${getCapabilityColor(capabilities.camera)}`}>Camera</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>{getCapabilityIcon(capabilities.geolocation)}</span>
                  <span className={`text-sm ${getCapabilityColor(capabilities.geolocation)}`}>Location</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>{getCapabilityIcon(capabilities.vibration)}</span>
                  <span className={`text-sm ${getCapabilityColor(capabilities.vibration)}`}>Vibration</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>{getCapabilityIcon(capabilities.fullscreen)}</span>
                  <span className={`text-sm ${getCapabilityColor(capabilities.fullscreen)}`}>Fullscreen</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>{getCapabilityIcon(capabilities.wakeLock)}</span>
                  <span className={`text-sm ${getCapabilityColor(capabilities.wakeLock)}`}>Wake Lock</span>
                </div>
                <div className="flex items-center gap-2">
                  <span>{getCapabilityIcon(capabilities.fileSystem)}</span>
                  <span className={`text-sm ${getCapabilityColor(capabilities.fileSystem)}`}>File System</span>
                </div>
              </div>
            </div>

            {/* Feature Controls */}
            <div className="space-y-4">
              {/* Fullscreen Control */}
              {capabilities.fullscreen && (
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h5 className="font-medium text-gray-800">Fullscreen Mode</h5>
                    <p className="text-sm text-gray-600">
                      {isFullscreen ? 'Currently in fullscreen' : 'Enter immersive fullscreen experience'}
                    </p>
                  </div>
                  <button
                    onClick={() => toggleFullscreen()}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      isFullscreen
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : 'bg-blue-500 text-white hover:bg-blue-600'
                    }`}
                  >
                    {isFullscreen ? '⬇️ Exit' : '⬆️ Enter'}
                  </button>
                </div>
              )}

              {/* Wake Lock Control */}
              {capabilities.wakeLock && (
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h5 className="font-medium text-gray-800">Keep Screen On</h5>
                    <p className="text-sm text-gray-600">
                      {wakeLock ? 'Screen will stay on' : 'Prevent screen from turning off during games'}
                    </p>
                  </div>
                  <button
                    onClick={handleToggleWakeLock}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      wakeLock
                        ? 'bg-green-500 text-white hover:bg-green-600'
                        : 'bg-gray-500 text-white hover:bg-gray-600'
                    }`}
                  >
                    {wakeLock ? '🔒 Active' : '🔓 Inactive'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'sharing' && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sharing & Export</h3>
            
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-800 mb-2">Share Templates</h4>
                <p className="text-sm text-blue-700 mb-3">
                  Pre-built sharing templates for different scenarios:
                </p>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-green-500">🏆</span>
                    <span>Game results with scores</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-blue-500">⭐</span>
                    <span>Player statistics</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-purple-500">👥</span>
                    <span>Team roster information</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-orange-500">📱</span>
                    <span>App recommendations</span>
                  </div>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-800 mb-3">Export Options</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <button className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                    <span className="text-xl">📊</span>
                    <div className="text-left">
                      <div className="font-medium text-gray-800">Game Reports</div>
                      <div className="text-sm text-gray-600">Export detailed game statistics</div>
                    </div>
                  </button>
                  
                  <button className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                    <span className="text-xl">👥</span>
                    <div className="text-left">
                      <div className="font-medium text-gray-800">Player Data</div>
                      <div className="text-sm text-gray-600">Export player statistics</div>
                    </div>
                  </button>
                  
                  <button className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                    <span className="text-xl">📅</span>
                    <div className="text-left">
                      <div className="font-medium text-gray-800">Season Summary</div>
                      <div className="text-sm text-gray-600">Export season overview</div>
                    </div>
                  </button>
                  
                  <button className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                    <span className="text-xl">💾</span>
                    <div className="text-left">
                      <div className="font-medium text-gray-800">Full Backup</div>
                      <div className="text-sm text-gray-600">Export all app data</div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'debug' && (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Feature Testing</h3>
            
            {/* Test Results */}
            {Object.keys(testResults).length > 0 && (
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <h4 className="font-medium text-gray-800 mb-2">Test Results</h4>
                <div className="space-y-1">
                  {Object.entries(testResults).map(([feature, result]) => (
                    <div key={feature} className="text-sm">
                      <strong>{feature}:</strong> {result}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Test Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {capabilities.vibration && (
                <button
                  onClick={handleTestVibration}
                  className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <span className="text-2xl">📳</span>
                  <div className="text-left">
                    <div className="font-medium">Test Vibration</div>
                    <div className="text-sm text-gray-600">Trigger haptic feedback</div>
                  </div>
                </button>
              )}

              {capabilities.webShare && (
                <button
                  onClick={handleTestShare}
                  className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <span className="text-2xl">📤</span>
                  <div className="text-left">
                    <div className="font-medium">Test Sharing</div>
                    <div className="text-sm text-gray-600">Try web share API</div>
                  </div>
                </button>
              )}

              {capabilities.clipboard && (
                <button
                  onClick={handleTestClipboard}
                  className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <span className="text-2xl">📋</span>
                  <div className="text-left">
                    <div className="font-medium">Test Clipboard</div>
                    <div className="text-sm text-gray-600">Copy text to clipboard</div>
                  </div>
                </button>
              )}

              {capabilities.geolocation && (
                <button
                  onClick={handleTestLocation}
                  className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <span className="text-2xl">📍</span>
                  <div className="text-left">
                    <div className="font-medium">Test Location</div>
                    <div className="text-sm text-gray-600">Get current position</div>
                  </div>
                </button>
              )}

              {capabilities.camera && (
                <button
                  onClick={handleTestCamera}
                  className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <span className="text-2xl">📷</span>
                  <div className="text-left">
                    <div className="font-medium">Test Camera</div>
                    <div className="text-sm text-gray-600">Capture photo</div>
                  </div>
                </button>
              )}
            </div>

            {/* System Info */}
            <div className="mt-6 bg-gray-50 rounded-lg p-4">
              <h4 className="font-medium text-gray-800 mb-3">System Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>User Agent:</strong>
                  <div className="text-gray-600 break-all">{navigator.userAgent}</div>
                </div>
                <div>
                  <strong>Screen:</strong>
                  <div className="text-gray-600">{screen.width} × {screen.height}</div>
                </div>
                <div>
                  <strong>Viewport:</strong>
                  <div className="text-gray-600">{window.innerWidth} × {window.innerHeight}</div>
                </div>
                <div>
                  <strong>Platform:</strong>
                  <div className="text-gray-600">{navigator.platform}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}