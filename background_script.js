// Import plugin.js for service worker
importScripts('plugin.js');

var settings = ['seconds', 'reload', 'inactive', 'autostart', 'noRefreshList', 'reloadTabIds', 'tabTimings', 'reloadUrlList', 'tabTimingsByUrl'];
var instances = { };
var currentWindow = -2;
var globalConfig;
var isStartup = false;

function getInstance (windowId) {
  if (!windowId || windowId === -1) {
    return null;
  }
  return instances[windowId.toString()] || null;
}

function activeWindowChange (id) {
  console.log('Active window changed to:', id);
  currentWindow = id;
  
  // Invalid window ID kontrolü
  if (!id || id === -1 || id === chrome.windows.WINDOW_ID_NONE) {
    console.log('Invalid window ID, keeping current badge state');
    return;
  }
  
  var instance = getInstance(id);
  if (instance) {
    console.log('Updating badge for window:', id, 'isGoing:', instance.isGoing);
    updateBadgeForInstance(instance, instance.isUserIdle);
  } else {
    console.log('No instance found for new active window:', id);
    
    // Instance yoksa ama globalConfig varsa yeni instance oluştur
    if (globalConfig) {
      try {
        console.log('Creating missing instance for active window:', id);
        var newInstance = instances[id.toString()] = new ReloadPlugin(globalConfig, id);
        newInstance.currentWindow = id;
        
        // Autostart kontrolü
        if (globalConfig.autostart) {
          console.log('Auto-starting new instance for window:', id);
          setTimeout(function() {
            newInstance.start();
            updateBadgeForInstance(newInstance, newInstance.isUserIdle || false);
          }, 500);
        } else {
          // Autostart kapalıysa kırmızı badge
          updateBadgeForInstance(newInstance, false);
        }
      } catch (error) {
        console.error('Error creating instance for window:', id, error);
        // Hata durumunda da kırmızı badge
        chrome.action.setBadgeText({text:" "});
        chrome.action.setBadgeBackgroundColor({color:[239, 68, 68, 255]});
      }
    } else {
      console.log('No globalConfig available, setting inactive badge');
      // GlobalConfig yoksa kırmızı badge
      chrome.action.setBadgeText({text:" "});
      chrome.action.setBadgeBackgroundColor({color:[239, 68, 68, 255]});
    }
  }
}

// Otomatik başlatma fonksiyonu
function autoStartIfEnabled() {
  console.log('autoStartIfEnabled called, globalConfig:', globalConfig);
  
  if (!globalConfig || !globalConfig.autostart) {
    console.log('Autostart disabled or config not ready');
    return;
  }
  
  console.log('Autostart enabled, checking windows...');
  
  chrome.windows.getAll(function (windows) {
    console.log('Found windows for autostart:', windows.length);
    
    [].forEach.call(windows, function (win) {
      if (!win || !win.id) {
        return;
      }
      
      var instance = getInstance(win.id);
      if (instance) {
        console.log('Starting autostart for window:', win.id);
        instance.start();
        updateBadgeForInstance(instance, instance.isUserIdle);
      }
    });
  });
}

function init (config) {
  globalConfig = config || {};
  console.log('Extension init called with config:', config);
  
  chrome.windows.getAll(function (windows) {
    if (!windows || windows.length === 0) {
      console.warn('No windows found during initialization');
      return;
    }
    
    console.log('Initializing', windows.length, 'windows');
    
    [].forEach.call(windows, function (win) {
      if (!win || !win.id) {
        console.warn('Invalid window object:', win);
        return;
      }
      
      try {
        var p = instances[win.id.toString()] = new ReloadPlugin(config, win.id);
        p.currentWindow = win.id;
        console.log('Created ReloadPlugin instance for window:', win.id);

        if (win.focused) {
          activeWindowChange(win.id);
        }
      } catch (error) {
        console.error('Error creating ReloadPlugin instance for window:', win.id, error);
      }
    });
    
    // Otomatik başlatmayı init'ten sonra yap
    if (config.autostart) {
      console.log('Config has autostart enabled, scheduling autostart...');
      setTimeout(function() {
        autoStartIfEnabled();
      }, 2000); // 2 saniyeye çıkardım
    }
  });

  try {
    // Initialize badge as inactive (red)
    chrome.action.setBadgeText({text:" "});
    chrome.action.setBadgeBackgroundColor({color: [239, 68, 68, 255]});
  } catch (error) {
    console.error('Error setting badge background color:', error);
  }
}

function updateBadgeForInstance (inst, isIdle) {
  console.log('updateBadgeForInstance called:', {
    isGoing: inst ? inst.isGoing : 'no instance',
    tabInactive: inst ? inst.tabInactive : 'no instance',
    isIdle: isIdle
  });
  
  try {
    if (inst && inst.isGoing) {
      // Eğer tabInactive aktif ve kullanıcı aktifse (idle değilse) sarı renk göster
      if (inst.tabInactive && !isIdle) {
        console.log('Setting YELLOW badge - User is active, waiting for idle');
        chrome.action.setBadgeText({text:"⏳"});
        chrome.action.setBadgeBackgroundColor({color:[255, 193, 7, 255]}); // Sarı renk
        chrome.action.setTitle({title: chrome.i18n.getMessage('waitingTitle') || 'Tab Hopper - Beklemede (Kullanıcı Aktif)'});
      } else {
        // Normal çalışma durumu - yeşil (tabInactive kapalı VEYA kullanıcı idle)
        console.log('Setting GREEN badge - Tab rotation active');
        chrome.action.setBadgeText({text:" "});
        chrome.action.setBadgeBackgroundColor({color:[34, 197, 94, 255]});
        chrome.action.setTitle({title: chrome.i18n.getMessage('enabledTitle') || 'Tab Hopper - Etkin'});
      }
    }
    else {
      // Durdurulmuş durumu - kırmızı
      console.log('Setting RED badge - Tab Hopper disabled');
      chrome.action.setBadgeText({text:" "});
      chrome.action.setBadgeBackgroundColor({color:[239, 68, 68, 255]});
      chrome.action.setTitle({title: chrome.i18n.getMessage('disabledTitle') || 'Tab Hopper - Devre Dışı'});
    }
  } catch (error) {
    console.error('Error updating badge:', error);
  }
}

// Chrome V3 için mesaj dinleyicisi
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  console.log('🔥 MESSAGE RECEIVED:', request.action); // Debug log
  
  try {
    if (request.action === 'updateSettings') {
      console.log('Received settings update request:', request.settings);
      globalConfig = request.settings;
      
      chrome.windows.getCurrent(function (win) {
        console.log('Current window for settings update:', win.id);
        var instance = getInstance(win.id);
        if (instance && typeof instance.update === 'function') {
          try {
            console.log('Updating instance for window:', win.id, 'with settings:', request.settings);
            instance.update(request.settings);
            sendResponse({success: true});
          } catch (error) {
            console.error('Error updating instance:', error);
            sendResponse({success: false, error: error.message});
          }
        } else {
          console.warn('No valid instance found for window:', win.id);
          console.log('Available instances:', Object.keys(instances));
          
          // Tüm instance'ları güncelle
          var updatedCount = 0;
          for (var winId in instances) {
            if (instances[winId] && typeof instances[winId].update === 'function') {
              try {
                console.log('Updating instance for window:', winId);
                instances[winId].update(request.settings);
                updatedCount++;
              } catch (error) {
                console.error('Error updating instance', winId, ':', error);
              }
            }
          }
          
          console.log('Updated', updatedCount, 'instances total');
          sendResponse({success: true, updatedInstances: updatedCount});
        }
      });
      return true; // Asenkron yanıt için gerekli
    }
    else if (request.action === 'restartTabHopper') {
      console.log('🔄 RESTART TAB HOPPER:', request.settings);
      
      // Önce tüm badge'leri sıfırla
      console.log('🎨 Resetting all badges...');
      chrome.action.setBadgeText({text:" "});
      chrome.action.setBadgeBackgroundColor({color:[239, 68, 68, 255]}); // Kırmızı başlangıç
      chrome.action.setTitle({title: chrome.i18n.getMessage('disabledTitle') || 'Tab Hopper - Devre Dışı'});
      
      // Önce tüm instance'ları durdur ve ayarları güncelle
      chrome.windows.getAll(function(windows) {
        console.log('Processing Tab Hopper restart for', windows.length, 'windows');
        
        var restartedCount = 0;
        var startedCount = 0;
        var updatedCount = 0;
        
        windows.forEach(function(win) {
          if (!win || !win.id) return;
          
          var instance = getInstance(win.id);
          if (instance) {
            // Önce durdur (çalışıyorsa)
            if (instance.isGoing) {
              instance.stop();
              restartedCount++;
              console.log('⏹️ Stopped Tab Hopper for window:', win.id);
            }
            
            // Ayarları güncelle (her durumda)
            instance.update(request.settings);
            updatedCount++;
            console.log('⚙️ Updated settings for window:', win.id);
            
            // Autostart kontrolü
            if (request.settings.autostart) {
              // Autostart açık - başlat
              setTimeout(function() {
                instance.start();
                startedCount++;
                console.log('▶️ Started Tab Hopper for window:', win.id);
                
                // Badge'i güncel duruma göre ayarla
                setTimeout(function() {
                  if (request.settings.inactive) {
                    // Chrome idle API'sini kontrol et
                    chrome.idle.queryState(15, function(state) {
                      var isUserIdle = (state === 'idle');
                      instance.isUserIdle = isUserIdle;
                      updateBadgeForInstance(instance, isUserIdle);
                      console.log('🎨 Badge updated for window:', win.id, 'isUserIdle:', isUserIdle);
                    });
                  } else {
                    // Normal çalışma modu - direkt yeşil
                    instance.isUserIdle = false;
                    updateBadgeForInstance(instance, false);
                    console.log('🎨 Badge set to GREEN for window:', win.id);
                  }
                }, 100);
                
              }, 200 * windows.indexOf(win)); // Her window için kademeli başlatma
            } else {
              // Autostart kapalı - durdur ve kırmızı badge
              instance.isUserIdle = false;
              updateBadgeForInstance(instance, false); // Bu kırmızı yapacak çünkü isGoing=false
              console.log('🔴 Autostart disabled, keeping STOPPED state for window:', win.id);
            }
          }
        });
        
        setTimeout(function() {
          console.log('✅ RESTART COMPLETE:', {
            restartedCount: restartedCount,
            startedCount: startedCount,
            updatedCount: updatedCount,
            autostart: request.settings.autostart,
            inactive: request.settings.inactive
          });
          
          sendResponse({
            success: true, 
            message: 'Tab Hopper restarted and settings updated',
            restartedCount: restartedCount,
            startedCount: startedCount,
            updatedCount: updatedCount
          });
        }, 1000);
      });
      
      return true; // Asenkron yanıt için gerekli
    }
    else if (request.action === 'updateIdleState') {
      console.log('Received idle state update:', {
        isIdle: request.isIdle,
        isGoing: request.isGoing,
        tabInactive: request.tabInactive
      });
      
      // Idle state değişikliği için badge güncelle
      chrome.windows.getCurrent(function (win) {
        var instance = getInstance(win.id);
        if (instance) {
          // Instance'ın idle state'ini güncelle
          instance.isUserIdle = request.isIdle;
          
          updateBadgeForInstance(instance, request.isIdle);
          sendResponse({success: true});
        } else {
          console.log('No instance found for idle state update, window:', win.id);
          sendResponse({success: false, error: 'No instance found'});
        }
      });
      return true; // Asenkron yanıt için gerekli
    }
    else {
      sendResponse({success: false, error: 'Unknown action: ' + request.action});
    }
  } catch (error) {
    console.error('Error in message listener:', error);
    sendResponse({success: false, error: error.message});
  }
  
  return true; // Asenkron yanıt için gerekli
});

chrome.storage.sync.get(settings, init);

// Chrome extension startup event'i - tarayıcı açıldığında
chrome.runtime.onStartup.addListener(function() {
  console.log('Chrome startup detected');
  isStartup = true;
  
  // Biraz bekle ve config'i tekrar yükle
  setTimeout(function() {
    chrome.storage.sync.get(settings, function(config) {
      console.log('Startup config loaded:', config);
      globalConfig = config;
      autoStartIfEnabled();
    });
  }, 3000);
});

// Extension ilk install/enable edildiğinde
chrome.runtime.onInstalled.addListener(function(details) {
  console.log('Extension installed/enabled:', details.reason);
  
  if (details.reason === 'startup' || details.reason === 'chrome_update') {
    setTimeout(function() {
      chrome.storage.sync.get(settings, function(config) {
        console.log('Install/startup config loaded:', config);
        globalConfig = config;
        autoStartIfEnabled();
      });
    }, 3000);
  }
});

chrome.action.onClicked.addListener(function () {
  console.log('Extension icon clicked, currentWindow:', currentWindow);
  
  // Tüm instance'ları kontrol et - herhangi biri çalışıyor mu?
  var anyRunningInstance = null;
  var allInstances = [];
  
  for (var winId in instances) {
    if (instances[winId]) {
      allInstances.push(instances[winId]);
      if (instances[winId].isGoing) {
        anyRunningInstance = instances[winId];
        console.log('Found running instance in window:', winId);
      }
    }
  }
  
  console.log('Total instances found:', allInstances.length);
  console.log('Any running instance:', anyRunningInstance ? 'YES' : 'NO');
  
  if (anyRunningInstance) {
    // Herhangi bir instance çalışıyorsa, HEPSİNİ DURDUR
    console.log('🛑 Stopping ALL instances');
    allInstances.forEach(function(instance) {
      if (instance.isGoing) {
        console.log('🛑 Stopping instance for window:', instance.currentWindow);
        instance.stop();
      }
    });
    
    // Badge'i kırmızı yap
    chrome.action.setBadgeText({text:" "});
    chrome.action.setBadgeBackgroundColor({color:[239, 68, 68, 255]});
    chrome.action.setTitle({title: chrome.i18n.getMessage('disabledTitle') || 'Tab Hopper - Devre Dışı'});
    
  } else {
    // Hiç instance çalışmıyorsa, mevcut window'u başlat
    console.log('▶️ Starting extension for current window');
    
    chrome.windows.getCurrent(function (win) {
      console.log('Current window from getCurrent:', win ? win.id : 'none');
      
      var windowToUse = win && win.id ? win.id : currentWindow;
      console.log('Using window:', windowToUse);
      
      var instance = getInstance(windowToUse);
      if (!instance) {
        console.warn('No instance found for window:', windowToUse);
        
        // Hiç instance yoksa yeni bir tane oluştur
        if (globalConfig && windowToUse && windowToUse !== -1) {
          console.log('Creating new instance for window:', windowToUse);
          instance = instances[windowToUse.toString()] = new ReloadPlugin(globalConfig, windowToUse);
          instance.currentWindow = windowToUse;
        } else {
          console.error('Cannot create instance - missing config or window');
          return;
        }
      }
      
      console.log('Starting instance for window:', windowToUse);
      instance.start();
      updateBadgeForInstance(instance, instance.isUserIdle);
    });
  }
});

chrome.windows.onFocusChanged.addListener(function(windowId) {
  // Sadece geçerli window ID'leri için işlem yap
  if (windowId && windowId !== -1 && windowId !== chrome.windows.WINDOW_ID_NONE) {
    activeWindowChange(windowId);
  } else {
    console.log('Invalid or no window focused, window ID:', windowId);
  }
});
chrome.windows.onCreated.addListener(function (win) {
  if (!globalConfig) {
    console.warn('Global config not yet loaded, skipping window creation for:', win.id);
    return;
  }
  
  try {
    var i = instances[win.id.toString()] = new ReloadPlugin(globalConfig, win.id);
    i.currentWindow = win.id;
    console.log('New window created:', win.id);
    
    // Yeni pencere için otomatik başlatma kontrolü
    if (globalConfig.autostart) {
      console.log('Autostarting new window:', win.id);
      setTimeout(function() {
        i.start();
        updateBadgeForInstance(i, i.isUserIdle || false);
      }, 1500);
    }
  } catch (error) {
    console.error('Error creating ReloadPlugin instance:', error);
  }
});
chrome.windows.onRemoved.addListener(function (id) {
  var instanceKey = id.toString();
  var instance = instances[instanceKey];
  
  if (instance && typeof instance.destroy === 'function') {
    try {
      instance.destroy();
    } catch (error) {
      console.error('Error destroying instance:', error);
    }
  }
  
  delete instances[instanceKey];
});