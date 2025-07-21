var ReloadPlugin = function (settings, windowId) {
  var self = this;
  self.update(settings);
  self.isGoing = false;
  self.isUserIdle = false; // Kullanıcının idle durumunu takip et
  self.currentWindow = windowId || chrome.windows.WINDOW_ID_CURRENT; // Window ID'sini ata
  self.tabActivatedListener = null; // Event listener referansını sakla

  // Chrome idle API ile idle detection
  if (chrome.idle) {
    // Context test
    console.log('Plugin context check:', {
      hasWindow: typeof window !== 'undefined',
      hasUpdateBadgeForInstance: typeof updateBadgeForInstance === 'function',
      hasChrome: typeof chrome !== 'undefined',
      hasChromeAction: typeof chrome !== 'undefined' && !!chrome.action
    });
    
    // Idle threshold: 15 saniye (Chrome minimum)
    chrome.idle.setDetectionInterval(15);
    
    chrome.idle.onStateChanged.addListener(function(state) {
      console.log('Chrome idle API - User idle state changed:', state);
      self.isUserIdle = (state === 'idle' || state === 'locked');
      
      // Eğer tabInactive aktifse ve kullanıcı aktif olmuşsa timer'ı durdur
      if (self.tabInactive && !self.isUserIdle && self.isGoing) {
        console.log('User became active, pausing tab rotation');
        clearTimeout(self.timer);
        // Badge'i YELLOW yap (bekleme durumu)
        self.sendIdleStateUpdate(self.isUserIdle);
      }
      
      // Eğer tabInactive aktifse ve kullanıcı idle olmuşsa timer'ı başlat
      if (self.tabInactive && self.isUserIdle && self.isGoing) {
        console.log('User became idle, resuming tab rotation');
        self.startTimer(); // Bu zaten badge'i günceller
      }
      
      // Badge güncellemesi için background'a mesaj gönder (tabInactive kapalıysa)
      if (!self.tabInactive) {
        self.sendIdleStateUpdate(self.isUserIdle);
      }
    });
    
    // Idle API test için debug fonksiyonu (Console'da kullanmak için)
    // Background script context'inde window objesi olmadığı için kontrol edelim
    if (typeof window !== 'undefined') {
      window.forceIdleTest = function() {
        console.log('MANUAL TEST: Forcing idle state...');
        self.isUserIdle = true;
        
        if (self.tabInactive && self.isUserIdle && self.isGoing) {
          console.log('Manual test: User became idle, resuming tab rotation');
          self.startTimer();
        }
        
        // Badge güncellemesi için background'a mesaj gönder
        self.sendIdleStateUpdate(true);
      };
      console.log('Debug function available: forceIdleTest()');
    } else {
      // Background script context - global fonksiyon oluştur
      self.forceIdleTest = function() {
        console.log('BACKGROUND MANUAL TEST: Forcing idle state...');
        self.isUserIdle = true;
        
        if (self.tabInactive && self.isUserIdle && self.isGoing) {
          console.log('Background manual test: User became idle, resuming tab rotation');
          self.startTimer();
        }
        
        // Badge güncellemesi için background'a mesaj gönder
        self.sendIdleStateUpdate(true);
      };
      console.log('Background context - debug function available on instance');
    }
  } else {
    console.error('Chrome idle API not available!');
  }

  // Tab değişikliği listener'ını sadece extension aktifken dinle
  self.tabActivatedListener = function (activeInfo) {
    chrome.tabs.get(activeInfo.tabId, function (t) {
      if (chrome.runtime.lastError) {
        console.error('Error getting tab info:', chrome.runtime.lastError.message);
        return;
      }
      
      // Sadece aynı window'daki tab değişikliklerini dinle
      if (t && t.windowId === self.currentWindow) {
        console.log('📋 Tab activated in our window:', t.id, t.title);
        self.currentTab = t;
        
        // SADECE extension aktifse timer'ı yeniden başlat
        if (self.isGoing) {
          console.log('🔄 Extension is active, restarting timer for new tab');
          self.startTimer();
        } else {
          console.log('🚫 Extension is stopped, ignoring tab change');
        }
      } else {
        console.log('📋 Tab activated in different window - ignoring');
      }
    });
  };
  
  // Listener'ı ekle
  chrome.tabs.onActivated.addListener(self.tabActivatedListener);
};

ReloadPlugin.prototype.update = function (settings) {
  console.log('=== PLUGIN UPDATE CALLED ===');
  console.log('Previous settings:', {
    timeDelay: this.timeDelay,
    tabReload: this.tabReload,
    reloadTabIds: this.reloadTabIds,
    tabTimings: this.tabTimings
  });

  this.timeDelay = (settings.seconds || 10) * 1000;
  this.tabReload = settings.reload === true;
  this.reloadTabIds = settings.reloadTabIds || [];
  this.tabTimings = settings.tabTimings || {};
  this.tabInactive = settings.inactive === true;
  
  // URL bazlı ayarlar (yeni sistem)
  this.reloadUrlList = settings.reloadUrlList || [];
  this.tabTimingsByUrl = settings.tabTimingsByUrl || {};

  console.log('New settings applied:', {
    timeDelay: this.timeDelay,
    tabReload: this.tabReload,
    reloadTabIds: this.reloadTabIds,
    tabTimings: this.tabTimings,
    reloadUrlList: this.reloadUrlList,
    tabTimingsByUrl: this.tabTimingsByUrl,
    tabInactive: this.tabInactive
  });
  console.log('=== PLUGIN UPDATE END ===');
};

ReloadPlugin.prototype.start = function () {
  var self = this;
  self.isGoing = true;
  
  // İlk başlatmada idle durumunu kontrol et
  if (self.tabInactive && chrome.idle) {
    chrome.idle.queryState(15, function(state) {
      console.log('Initial idle state check:', state);
      self.isUserIdle = (state === 'idle' || state === 'locked');
      
      // Badge güncellemesi için background'a mesaj gönder
      self.sendIdleStateUpdate(self.isUserIdle);
      
      self.getActiveTab(function (tab) {
        self.currentTab = tab;
        self.startTimer();
        
        // Health check'i başlat (5 saniye sonra)
        setTimeout(function() {
          self.healthCheck();
        }, 5000);
      });
    });
  } else {
    // Normal mod - idle kontrolü yok, direkt başlat
    self.isUserIdle = false;
    
    // Badge güncellemesi - yeşil (aktif) yap
    self.sendIdleStateUpdate(false);
    
    self.getActiveTab(function (tab) {
      self.currentTab = tab;
      self.startTimer();
      
      // Health check'i başlat (5 saniye sonra)
      setTimeout(function() {
        self.healthCheck();
      }, 5000);
    });
  }
};

ReloadPlugin.prototype.stop = function () {
  var self = this;
  
  console.log('🛑 STOP called for window:', self.currentWindow);
  
  // Extension durumunu false yap
  self.isGoing = false;
  
  // Timer'ı temizle
  if (self.timer) {
    clearTimeout(self.timer);
    self.timer = null;
    console.log('Timer cleared');
  }
  
  // Badge'i kırmızı (durdurulmuş) yap
  self.sendIdleStateUpdate(false); // Badge güncellemesi için
  
  console.log('🔴 Extension stopped for window:', self.currentWindow);
  
  // Bu kısım artık Chrome'un varsayılan idle API'si ile yönetiliyor
  // Custom idle detection sistemini kaldırdığımız için bu kısım boşaltılabilir
  // if (self.idleCheckInterval) {
  //   clearInterval(self.idleCheckInterval);
  //   self.idleCheckInterval = null;
  // }
};

// URL'den domain çıkarma fonksiyonu
ReloadPlugin.prototype.getDomainFromUrl = function(url) {
  try {
    if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
      return url; // Özel protokoller için tam URL'i döndür
    }
    var urlObj = new URL(url);
    return urlObj.hostname;
  } catch (error) {
    return url; // Parse edilemeyen URL'ler için tam URL'i döndür
  }
};

// URL bazlı reload kontrolü
ReloadPlugin.prototype.shouldReloadTabByUrl = function(tabUrl) {
  var self = this;
  if (!tabUrl || !self.reloadUrlList) return false;
  
  var domain = self.getDomainFromUrl(tabUrl);
  return self.reloadUrlList.indexOf(domain) > -1;
};

// URL bazlı timing kontrolü  
ReloadPlugin.prototype.getTabTimingByUrl = function(tabUrl) {
  var self = this;
  if (!tabUrl || !self.tabTimingsByUrl) return null;
  
  var domain = self.getDomainFromUrl(tabUrl);
  return self.tabTimingsByUrl[domain] || null;
};

ReloadPlugin.prototype.startTimer = function () {
  var self = this;
  
  // GÜVENLİK KONTROLÜ: Extension aktif değilse timer başlatma
  if (!self.isGoing) {
    console.log('🚫 startTimer called but extension is stopped - ignoring');
    return;
  }
  
  // Mevcut timer'ı temizle
  clearTimeout(self.timer);
  
  // Idle state kontrolü
  if (self.tabInactive && !self.isUserIdle) {
    console.log('Tab rotation paused - user is active (inactive mode enabled)');
    
    // Badge'i YELLOW (beklemede) yap - user aktif olduğu için bekliyoruz
    self.sendIdleStateUpdate(false); // isIdle = false, kullanıcı aktif
    return;
  }

  var currentTabId = self.currentTab ? self.currentTab.id : null;
  var delay = self.timeDelay; // Default delay

  // Tab-specific timing kontrolü (ID bazlı - geriye uyumluluk)
  if (currentTabId && self.tabTimings && self.tabTimings[currentTabId]) {
    delay = self.tabTimings[currentTabId] * 1000;
    console.log('Using ID-based timing:', delay / 1000, 'seconds for tab:', currentTabId);
  }
  // URL bazlı timing kontrolü (yeni sistem)
  else if (self.currentTab && self.currentTab.url) {
    var urlTiming = self.getTabTimingByUrl(self.currentTab.url);
    if (urlTiming) {
      delay = urlTiming * 1000;
      console.log('Using URL-based timing:', delay / 1000, 'seconds for domain:', self.getDomainFromUrl(self.currentTab.url));
    } else {
      console.log('Using default timing:', delay / 1000, 'seconds');
    }
  } else {
    console.log('Using default timing:', delay / 1000, 'seconds');
  }

  console.log('Starting timer for', delay / 1000, 'seconds');
  
  // Badge'i GREEN (aktif) yap - timer çalışıyor
  self.sendIdleStateUpdate(self.isUserIdle); // Mevcut idle durumunu gönder
  
  self.timer = setTimeout(function () {
    // Timer çalıştığında da extension hala aktif mi kontrol et
    if (self.isGoing) {
      self.loadNextTab();
    } else {
      console.log('🚫 Timer fired but extension is stopped - not loading next tab');
    }
  }, delay);
};

// Geriye uyumluluk için next fonksiyonu - loadNextTab'ın alias'ı
ReloadPlugin.prototype.next = function () {
  this.loadNextTab();
};

// Tab yenileme fonksiyonu
ReloadPlugin.prototype.reloadTab = function (tab) {
  console.log('🔄 Reloading tab:', tab.id, tab.title);
  chrome.tabs.reload(tab.id, {}, function() {
    if (chrome.runtime.lastError) {
      console.error('❌ Failed to reload tab:', tab.id, chrome.runtime.lastError.message);
    } else {
      console.log('✅ Tab reloaded successfully:', tab.id);
    }
  });
};

ReloadPlugin.prototype.getActiveTab = function (cb) {
  var self = this;
  chrome.tabs.query({
    'active': true, 
    'windowId': self.currentWindow
  }, function (tab) {
    cb(tab[0]);
  });
};

ReloadPlugin.prototype.loadNextTab = function () {
  var self = this;
  
  // GÜVENLİK KONTROLÜ: Extension aktif değilse işlem yapma
  if (!self.isGoing) {
    console.log('🚫 loadNextTab called but extension is stopped - ignoring');
    return;
  }
  
  // currentTab null check
  if (!self.currentTab) {
    console.log('⚠️ currentTab is null, getting active tab first');
    self.getActiveTab(function(tab) {
      if (tab) {
        self.currentTab = tab;
        self.loadNextTab(); // Recursive call after getting currentTab
      } else {
        console.error('❌ No active tab found, stopping rotation');
        self.stop(); // Stop the rotation if no tab found
      }
    });
    return;
  }
  
  var ix = self.currentTab.index + 1;

  chrome.tabs.query({ windowId: self.currentWindow }, function (tabs) {
    // Extension hala aktif mi kontrol et
    if (!self.isGoing) {
      console.log('🚫 Extension stopped while querying tabs - aborting loadNextTab');
      return;
    }
    
    if (ix >= tabs.length) {
      ix = 0;
    }
    console.log('🔄 Window:', self.currentWindow, 'Next index:', ix, 'Total tabs:', tabs.length);

    var nextTab = tabs.filter(function (t) {
      return t.index === ix;
    });

    if (nextTab.length > 0) {
      self.activateTab(nextTab[0]);
    } else {
      console.error('❌ No tab found at index:', ix);
      // Tab bulunamazsa rotation'ı durdurmak yerine mevcut tab'da kalarak timer'ı yeniden başlat
      console.log('🔄 Retrying with current tab');
      self.startTimer();
    }
  });
};

ReloadPlugin.prototype.shouldReloadTab = function (id) {
  var self = this;
  
  console.log('=== SHOULD RELOAD TAB DEBUG ===');
  console.log('Tab ID:', id);
  console.log('Current settings:', {
    tabReload: self.tabReload,
    reloadTabIds: self.reloadTabIds,
    reloadTabIdsLength: self.reloadTabIds.length,
    reloadTabIdsType: typeof self.reloadTabIds
  });

  // ID bazlı kontrol (mevcut sistem - geriye uyumluluk)
  if (self.reloadTabIds.indexOf(id) > -1) {
    console.log('✅ Tab in specific reload ID list, will reload');
    console.log('=== SHOULD RELOAD TAB END ===');
    return true;
  }

  // Global reload ayarı kontrolü
  if (self.tabReload) {
    if (self.reloadTabIds.length === 0) {
      console.log('✅ Global reload enabled and no specific tabs selected, will reload');
      console.log('=== SHOULD RELOAD TAB END ===');
      return true;
    } else {
      console.log('❌ Global reload enabled but specific tabs selected, this tab not in ID list');
      console.log('=== SHOULD RELOAD TAB END ===');
      return false;
    }
  } else {
    console.log('❌ Global reload disabled and tab not in specific list, not reloading');
  }

  console.log('=== SHOULD RELOAD TAB END ===');
  return false;
};

ReloadPlugin.prototype.activateTab = function (tab) {
  var self = this;
  
  // GÜVENLİK KONTROLÜ: Extension aktif değilse işlem yapma
  if (!self.isGoing) {
    console.log('🚫 activateTab called but extension is stopped - ignoring');
    return;
  }
  
  console.log('🎯 Activating tab:', tab.id, tab.title);
  
  // Current tab'ı güncelle
  self.currentTab = tab;
  
  // Tab'ı aktif yap - Error handling ile
  chrome.tabs.update(tab.id, {active: true}, function() {
    if (chrome.runtime.lastError) {
      console.warn('⚠️ Could not activate tab (may be user dragging):', chrome.runtime.lastError.message);
      
      // Tab aktivasyonu başarısız olursa, kısa süre sonra tekrar dene
      setTimeout(function() {
        if (self.isGoing && self.currentTab && self.currentTab.id === tab.id) {
          console.log('🔄 Retrying tab activation after delay');
          chrome.tabs.update(tab.id, {active: true}, function() {
            if (chrome.runtime.lastError) {
              console.warn('⚠️ Second attempt to activate tab also failed:', chrome.runtime.lastError.message);
              // İkinci deneme de başarısız olursa, timer'ı yeniden başlat
              self.startTimer();
            } else {
              console.log('✅ Tab activated successfully on second attempt');
            }
          });
        }
      }, 500); // 500ms bekle ve tekrar dene
      
      // İlk denemede başarısız olsa da diğer işlemlere devam et
    } else {
      console.log('✅ Tab activated successfully');
    }
    
    // Reload kontrolü ve diğer işlemler devam etsin
    self.processTabActivation(tab);
  });
};

// Tab aktivasyon sonrası işlemleri ayrı fonksiyona taşı
ReloadPlugin.prototype.processTabActivation = function(tab) {
  var self = this;
  
  // Extension hala aktif mi kontrol et
  if (!self.isGoing) {
    console.log('🚫 Extension stopped during tab activation - aborting process');
    return;
  }
  
  // Reload kontrolü - URL bazlı (yeni sistem)
  var shouldReloadByUrl = false;
  if (self.reloadUrlList && self.reloadUrlList.length > 0 && tab.url) {
    var domain = self.getDomainFromUrl(tab.url);
    shouldReloadByUrl = self.reloadUrlList.indexOf(domain) > -1;
    console.log('🔍 URL-based reload check - Domain:', domain, 'Should reload:', shouldReloadByUrl);
  }
  
  // Reload kontrolü - ID bazlı (geriye uyumluluk) veya global ayar
  var shouldReloadById = self.shouldReloadTab(tab.id);
  
  // URL bazlı veya ID bazlı reload gerekiyorsa yenile
  if (shouldReloadByUrl || shouldReloadById) {
    console.log('🔄 Reloading tab due to:', shouldReloadByUrl ? 'URL rule' : 'ID/Global rule');
    
    // Reload tamamlandığında timer başlat
    chrome.tabs.onUpdated.addListener(function tabLoadComplete(tabId, info, updatedTab) {
      if (info.status === "complete" && tabId === tab.id) {
        chrome.tabs.onUpdated.removeListener(tabLoadComplete);
        console.log('✅ Tab reload completed, starting timer');
        
        // Extension hala aktif mi kontrol et
        if (self.isGoing) {
          self.startTimer();
        } else {
          console.log('🚫 Extension stopped during tab reload - not starting timer');
        }
      }
    });
    
    // Doğrudan chrome.tabs.reload kullan (error handling ile)
    console.log('🔄 Reloading tab:', tab.id, tab.title);
    chrome.tabs.reload(tab.id, {}, function() {
      if (chrome.runtime.lastError) {
        console.error('❌ Failed to reload tab:', tab.id, chrome.runtime.lastError.message);
        // Reload başarısız olursa da timer'ı başlat (eğer extension aktifse)
        if (self.isGoing) {
          self.startTimer();
        }
      } else {
        console.log('✅ Tab reloaded successfully:', tab.id);
      }
    });
  } else {
    console.log('⏭️ Not reloading tab - no matching rules');
    // Reload olmayacaksa direkt timer başlat (eğer extension aktifse)
    if (self.isGoing) {
      self.startTimer();
    } else {
      console.log('🚫 Extension stopped - not starting timer');
    }
  }
};

ReloadPlugin.prototype.destroy = function () {
  var self = this;
  
  // Timer'ı durdur
  clearTimeout(self.timer);
  self.timer = null;
  
  // Extension'ı durdur
  self.isGoing = false;
  
  // Event listener'ları temizle
  if (self.tabActivatedListener) {
    try {
      chrome.tabs.onActivated.removeListener(self.tabActivatedListener);
      console.log('Tab activated listener removed');
    } catch (error) {
      console.error('Error removing tab activated listener:', error);
    }
    self.tabActivatedListener = null;
  }
  
  // Badge'i kırmızı yap (durdurulmuş)
  self.sendIdleStateUpdate(false);
  
  console.log('ReloadPlugin destroyed for window:', self.currentWindow);
};

// Badge güncellemesi için güvenilir mesaj gönderme fonksiyonu
ReloadPlugin.prototype.sendIdleStateUpdate = function(isIdle, retryCount) {
  var self = this;
  
  // Eğer background script context'inde çalışıyorsak, doğrudan badge'i güncelle
  if (typeof window === 'undefined' && typeof chrome !== 'undefined' && chrome.action) {
    console.log('Background context - updating badge directly');
    self.isUserIdle = isIdle; // Instance state'ini güncelle
    
    // Background script'teki updateBadgeForInstance fonksiyonunu çağır
    if (typeof updateBadgeForInstance === 'function') {
      try {
        updateBadgeForInstance(self, isIdle);
      } catch (error) {
        console.error('Error calling updateBadgeForInstance:', error);
        // Fallback olarak doğrudan badge güncellemesi yap
        self.directBadgeUpdate(isIdle);
      }
    } else {
      // Fallback - doğrudan badge'i güncelle
      self.directBadgeUpdate(isIdle);
    }
    return; // Background context'te mesaj göndermeye gerek yok
  }
  
  // Browser context'te çalışıyorsak, mesaj gönder
  retryCount = retryCount || 0;
  var maxRetries = 3;
  
  if (retryCount > maxRetries) {
    console.log('Max retries reached for idle state update, trying direct badge update');
    // Son çare olarak doğrudan badge güncellemesi dene
    try {
      self.directBadgeUpdate(isIdle);
    } catch (error) {
      console.error('Direct badge update also failed:', error);
    }
    return;
  }
  
  try {
    chrome.runtime.sendMessage({
      action: 'updateIdleState',
      isIdle: isIdle,
      isGoing: self.isGoing,
      tabInactive: self.tabInactive
    }, function(response) {
      if (chrome.runtime.lastError) {
        console.log('Idle state update failed (attempt ' + (retryCount + 1) + '):', chrome.runtime.lastError.message);
        
        // Context invalidated hatası ise, doğrudan badge güncellemesi dene
        if (chrome.runtime.lastError.message.includes('context invalidated') || 
            chrome.runtime.lastError.message.includes('message port closed')) {
          console.log('Context invalidated, trying direct badge update');
          try {
            self.directBadgeUpdate(isIdle);
          } catch (error) {
            console.error('Direct badge update failed after context invalidation:', error);
          }
          return;
        }
        
        // Retry after a delay
        setTimeout(function() {
          self.sendIdleStateUpdate(isIdle, retryCount + 1);
        }, 1000 * (retryCount + 1)); // Exponential backoff
      } else {
        console.log('Idle state update sent successfully:', response);
      }
    });
  } catch (error) {
    console.log('Could not send idle state update (attempt ' + (retryCount + 1) + '):', error);
    
    // Retry after a delay
    setTimeout(function() {
      self.sendIdleStateUpdate(isIdle, retryCount + 1);
    }, 1000 * (retryCount + 1));
  }
};

// Doğrudan badge güncellemesi için yardımcı fonksiyon
ReloadPlugin.prototype.directBadgeUpdate = function(isIdle) {
  var self = this;
  
  try {
    if (self.isGoing) {
      if (self.tabInactive && !isIdle) {
        console.log('Direct YELLOW badge - User is active, waiting for idle');
        chrome.action.setBadgeText({text:"⏳"});
        chrome.action.setBadgeBackgroundColor({color:[255, 193, 7, 255]});
        chrome.action.setTitle({title: 'Tab Hopper - Beklemede (Kullanıcı Aktif)'});
      } else {
        console.log('Direct GREEN badge - Tab rotation active');
        chrome.action.setBadgeText({text:" "});
        chrome.action.setBadgeBackgroundColor({color:[34, 197, 94, 255]});
        chrome.action.setTitle({title: 'Tab Hopper - Etkin'});
      }
    } else {
      console.log('Direct RED badge - Tab rotation stopped');
      chrome.action.setBadgeText({text:" "});
      chrome.action.setBadgeBackgroundColor({color:[239, 68, 68, 255]});
      chrome.action.setTitle({title: 'Tab Hopper - Devre Dışı'});
    }
  } catch (error) {
    console.error('Error in direct badge update:', error);
  }
};

// Extension sağlık kontrolü ve genel durum yönetimi
ReloadPlugin.prototype.healthCheck = function() {
  var self = this;
  
  // Extension durdurulmuşsa heartbeat'i durdur
  if (!self.isGoing) {
    console.log('🩺 Heartbeat stopped - extension inactive');
    return;
  }
  
  try {
    // Temel sağlık kontrolleri
    var isHealthy = true;
    var issues = [];
    
    // Window ID kontrolü
    if (!self.currentWindow || self.currentWindow === -1) {
      issues.push('Invalid window ID');
      isHealthy = false;
    }
    
    // Current tab kontrolü
    if (!self.currentTab) {
      issues.push('No current tab');
      // Active tab'ı yeniden almaya çalış
      self.getActiveTab(function(tab) {
        if (tab) {
          self.currentTab = tab;
          console.log('🩺 Recovered current tab:', tab.id);
        }
      });
    }
    
    // Timer kontrolü
    if (self.isGoing && !self.timer) {
      issues.push('Extension active but no timer');
      // Timer'ı yeniden başlat
      console.log('🩺 Restarting missing timer');
      self.startTimer();
    }
    
    if (issues.length > 0) {
      console.warn('🩺 Health check issues:', issues);
    } else {
      console.log('🩺 Extension health check: OK');
    }
    
    // Bir sonraki kontrol (30 saniye sonra)
    if (self.isGoing) {
      setTimeout(function() {
        self.healthCheck();
      }, 30000);
    }
    
  } catch (error) {
    console.error('🩺 Health check error:', error);
  }
};

// Chrome API hatalarını yöneten genel fonksiyon
ReloadPlugin.prototype.handleChromeError = function(operation, error, retryCallback) {
  var self = this;
  
  console.log('🚨 Chrome API Error in', operation + ':', error);
  
  // Yaygın hata türleri ve çözümleri
  if (error.includes('user may be dragging')) {
    console.log('🔄 User is dragging tabs - will retry after delay');
    if (retryCallback && typeof retryCallback === 'function') {
      setTimeout(retryCallback, 1000);
    }
    return true; // Handled
  }
  
  if (error.includes('Tab not found') || error.includes('No tab with id')) {
    console.log('🔄 Tab not found - getting current active tab');
    self.getActiveTab(function(tab) {
      if (tab) {
        self.currentTab = tab;
        if (retryCallback && typeof retryCallback === 'function') {
          retryCallback();
        }
      }
    });
    return true; // Handled
  }
  
  if (error.includes('context invalidated') || error.includes('Extension context invalidated')) {
    console.log('🔄 Extension context invalidated - stopping rotation');
    self.stop();
    return true; // Handled
  }
  
  if (error.includes('Window not found') || error.includes('No window with id')) {
    console.log('🔄 Window not found - may be closed');
    self.stop();
    return true; // Handled
  }
  
  // Handle edilmemiş hata
  console.warn('⚠️ Unhandled Chrome API error:', error);
  return false;
};