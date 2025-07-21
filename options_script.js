// Toast bildirim sistemi
function showToast(type, title, message, duration) {
  duration = duration || 4000;
  console.log('Showing toast:', type, title, message);
  
  // Mevcut toast'ları temizle
  var existingToasts = document.querySelectorAll('.toast');
  existingToasts.forEach(function(toast) {
    toast.remove();
  });
  
  // Yeni toast oluştur
  var toast = document.createElement('div');
  toast.className = 'toast ' + type;
  
  var icon = '';
  switch(type) {
    case 'success':
      icon = '✅';
      break;
    case 'error':
      icon = '❌';
      break;
    case 'info':
      icon = 'ℹ️';
      break;
    default:
      icon = '📢';
  }
  
  toast.innerHTML = 
    '<div class="toast-icon">' + icon + '</div>' +
    '<div class="toast-content">' +
      '<div class="toast-title">' + title + '</div>' +
      '<div class="toast-message">' + message + '</div>' +
    '</div>';
  
  document.body.appendChild(toast);
  
  // Animasyon için timeout
  setTimeout(function() {
    toast.classList.add('show');
  }, 100);
  
  // Otomatik kaldırma
  setTimeout(function() {
    toast.classList.remove('show');
    setTimeout(function() {
      if (toast.parentNode) {
        toast.remove();
      }
    }, 300);
  }, duration);
}

// Chrome V3 için background page'e erişim fonksiyonu
function sendMessageToBackground(message, callback) {
  chrome.runtime.sendMessage(message, callback);
}

// Background'dan getInstance fonksiyonunu kullanma yerine doğrudan update işlemi
function updateInstanceSettings(settings) {
  try {
    console.log('Sending settings update to background:', settings);
    chrome.runtime.sendMessage({
      action: 'updateSettings',
      settings: settings
    }, function(response) {
      if (chrome.runtime.lastError) {
        console.log('Could not update instance settings:', chrome.runtime.lastError.message);
      } else if (response && !response.success) {
        console.log('Settings update failed:', response.error);
      } else {
        console.log('Settings updated successfully:', response);
        if (response.updatedInstances) {
          console.log('Updated', response.updatedInstances, 'instances');
        }
      }
    });
  } catch (error) {
    console.log('Error sending settings update:', error);
  }
}

// Tab sayacını güncelle
function updateTabCounter() {
  var checkedTabs = document.querySelectorAll('#tab-list input[type="checkbox"]:checked');
  var counter = document.getElementById('tab-counter');
  var selectAllBtn = document.getElementById('select-all-btn');
  var totalTabs = document.querySelectorAll('#tab-list input[type="checkbox"]');
  
  if (counter) {
    var count = checkedTabs.length;
    var tabSelectedMsg = chrome.i18n.getMessage('tabSelected') || 'TAB Seçili';
    counter.textContent = count + ' ' + tabSelectedMsg;
    
    // Renk değişimi
    if (count > 0) {
      counter.style.background = 'rgba(52, 168, 83, 0.1)';
      counter.style.color = 'var(--secondary-color)';
    } else {
      counter.style.background = 'rgba(66, 133, 244, 0.1)';
      counter.style.color = 'var(--primary-color)';
    }
  }
  
  // Tümünü Seç butonunun metnini güncelle
  if (selectAllBtn && totalTabs.length > 0) {
    if (checkedTabs.length === totalTabs.length) {
      selectAllBtn.textContent = chrome.i18n.getMessage('deselectAll') || 'Tümünü Kaldır';
    } else {
      selectAllBtn.textContent = chrome.i18n.getMessage('selectAll') || 'Tümünü Seç';
    }
  }
}

// Tümünü seç/kaldır fonksiyonu
function toggleAllTabs() {
  var allCheckboxes = document.querySelectorAll('#tab-list input[type="checkbox"]');
  var checkedCount = document.querySelectorAll('#tab-list input[type="checkbox"]:checked').length;
  var shouldCheck = checkedCount !== allCheckboxes.length;
  
  allCheckboxes.forEach(function(checkbox) {
    checkbox.checked = shouldCheck;
    var li = checkbox.closest('li');
    if (li) {
      if (shouldCheck) {
        li.classList.add('selected');
      } else {
        li.classList.remove('selected');
      }
    }
  });
  
  updateTabCounter();
  
  // Toast bildirimi
  if (shouldCheck) {
    var allSelectedTitle = chrome.i18n.getMessage('allSelected') || 'Tümü Seçildi';
    var tabsSelectedMsg = chrome.i18n.getMessage('tabsSelected') || 'tab seçildi.';
    showToast('info', allSelectedTitle, allCheckboxes.length + ' ' + tabsSelectedMsg);
  } else {
    var allDeselectedTitle = chrome.i18n.getMessage('allDeselected') || 'Seçim Kaldırıldı';
    var allSelectionsRemovedMsg = chrome.i18n.getMessage('allSelectionsRemoved') || 'Tüm tab seçimleri kaldırıldı.';
    showToast('info', allDeselectedTitle, allSelectionsRemovedMsg);
  }
}

// i18n mesajlarını yükle
function loadI18nMessages() {
  document.querySelectorAll('[data-i18n]').forEach(function(element) {
    var messageKey = element.getAttribute('data-i18n');
    var message = chrome.i18n.getMessage(messageKey);
    if (message) {
      if (element.tagName === 'INPUT' && element.type === 'button') {
        element.value = message;
      } else {
        // Setting descriptions için innerHTML kullan (HTML formatları için)
        if (element.classList.contains('setting-description') || element.classList.contains('tab-list-description')) {
          element.innerHTML = message;
        } else {
          element.textContent = message;
        }
      }
    }
  });
  
  // Placeholder mesajlarını yükle
  document.querySelectorAll('[data-i18n-placeholder]').forEach(function(element) {
    var messageKey = element.getAttribute('data-i18n-placeholder');
    var message = chrome.i18n.getMessage(messageKey);
    if (message) {
      element.placeholder = message;
    }
  });
  
  // Title mesajlarını yükle
  document.querySelectorAll('[data-i18n-title]').forEach(function(element) {
    var messageKey = element.getAttribute('data-i18n-title');
    var message = chrome.i18n.getMessage(messageKey);
    if (message) {
      element.title = message;
    }
  });
  
  // Sayfa başlığını da güncelle
  var titleMessage = chrome.i18n.getMessage('optionsTitle');
  if (titleMessage) {
    document.title = titleMessage;
  }
  
  // Tab counter'ın ilk metnini ayarla
  var counter = document.getElementById('tab-counter');
  if (counter) {
    var tabSelectedMsg = chrome.i18n.getMessage('tabSelected') || 'TAB Seçili';
    counter.textContent = '0 ' + tabSelectedMsg;
  }
  
  // Sürüm numarasını manifest'ten dinamik olarak al
  var versionElement = document.getElementById('extension-version');
  if (versionElement) {
    var manifestData = chrome.runtime.getManifest();
    versionElement.textContent = 'v' + manifestData.version;
  }
  
  // İlk yüklemede tab timing placeholder'larını ayarla
  var secondsInput = document.getElementById('seconds');
  if (secondsInput && secondsInput.value) {
    updateTabTimingPlaceholders(secondsInput.value);
  }
}

document.addEventListener('DOMContentLoaded', function () {
  // i18n mesajlarını yükle
  loadI18nMessages();
  
  // Settings array'i burada tanımlamamız gerekiyor
  var settings = ['seconds', 'reload', 'inactive', 'autostart', 'noRefreshList', 'reloadTabIds', 'tabTimings', 'reloadUrlList', 'tabTimingsByUrl'];
  
  chrome.storage.sync.get(settings, function (settings) {
    var secondsValue = settings.seconds || 10;
    document.getElementById("seconds").value = secondsValue;
    document.getElementById("reload").checked = !!settings.reload;
    document.getElementById("inactive").checked = !!settings.inactive;
    document.getElementById("autostart").checked = !!settings.autostart;
    var rtIds = settings.reloadTabIds || [];
    var tabTimings = settings.tabTimings || {}; // Tab ID -> saniye mapping

      console.log('Loading tabs...');
      // Sekme listesini yenile (sadece mevcut pencere)
      refreshTabList(function(success) {
        if (!success) {
          console.error('Failed to load tab list');
        } else {
          // Tab listesi yüklendikten sonra placeholder'ları güncelle
          updateTabTimingPlaceholders(secondsValue.toString());
        }
      });
  });
  
  // Save buton event listener'ını ekle
  console.log('Adding event listeners to save buttons');
  var saveButtons = document.querySelectorAll(".save-btn");
  console.log('Found save buttons:', saveButtons.length);
  
  if (saveButtons.length > 0) {
    saveButtons.forEach(function(btn) {
      console.log('Adding listener to button:', btn);
      btn.addEventListener('click', function(e) {
        e.preventDefault();
        console.log('Save button clicked!');
        save_options();
      });
    });
  } else {
    // Fallback - eğer .save-btn class'ı bulunamazsa .btn-primary'yi dene
    var saveBtn = document.querySelector('.btn-primary');
    if (saveBtn) {
      console.log('Found save button by fallback class');
      saveBtn.addEventListener('click', function(e) {
        e.preventDefault();
        console.log('Save button clicked via fallback!');
        save_options();
      });
    } else {
      console.warn('No save button found!');
    }
  }
  
  // Debug için global fonksiyonlar
  window.debugTabHopper = {
    getCurrentSettings: function() {
      var settings = ['seconds', 'reload', 'inactive', 'autostart', 'noRefreshList', 'reloadTabIds', 'tabTimings', 'reloadUrlList', 'tabTimingsByUrl'];
      chrome.storage.sync.get(settings, function(result) {
        console.log('Current storage settings:', result);
        console.log('URL-based reload list:', result.reloadUrlList);
        console.log('URL-based timings:', result.tabTimingsByUrl);
      });
    },
    
    testSettingsUpdate: function() {
      var testSettings = {
        seconds: 7,
        reload: true,
        inactive: false,
        autostart: true,
        reloadTabIds: [187914556],
        tabTimings: {187914556: 12},
        reloadUrlList: ['example.com', 'google.com'],
        tabTimingsByUrl: {'example.com': 15, 'google.com': 8}
      };
      
      console.log('Testing settings update with:', testSettings);
      updateInstanceSettings(testSettings);
    },
    
    testRestart: function() {
      var testSettings = {
        seconds: 8,
        reload: true,
        inactive: true,
        autostart: true,
        reloadTabIds: [],
        tabTimings: {},
        reloadUrlList: ['github.com'],
        tabTimingsByUrl: {'github.com': 20}
      };
      
      console.log('Testing Tab Hopper restart with:', testSettings);
      restartTabHopperIfNeeded(testSettings);
    },
    
    showUrlMapping: function() {
      chrome.tabs.query({currentWindow: true}, function(tabs) {
        console.log('=== CURRENT WINDOW TAB-URL MAPPING ===');
        tabs.forEach(function(tab) {
          var domain = getDomainFromUrl(tab.url);
          console.log('Tab ID:', tab.id, '| Domain:', domain, '| Title:', tab.title);
        });
        console.log('=== END MAPPING ===');
      });
    }
  };
  
  console.log('Debug functions available:');
  console.log('- debugTabHopper.getCurrentSettings() - shows current settings');
  console.log('- debugTabHopper.testSettingsUpdate() - tests settings update');
  console.log('- debugTabHopper.testRestart() - tests Tab Hopper restart');
  console.log('- debugTabHopper.showUrlMapping() - shows tab ID to URL mapping');

  // Select All butonu event listener
  var selectAllBtn = document.getElementById('select-all-btn');
  if (selectAllBtn) {
    selectAllBtn.addEventListener('click', function() {
      console.log('🔄 Select All button clicked');
      
      var checkboxes = document.querySelectorAll('#tab-list input[type="checkbox"]');
      var allChecked = Array.from(checkboxes).every(cb => cb.checked);
      
      console.log('All checked status:', allChecked, 'Total checkboxes:', checkboxes.length);
      
      checkboxes.forEach(function(checkbox) {
        var wasChecked = checkbox.checked;
        checkbox.checked = !allChecked;
        
        // Change event'ini manuel olarak trigger et
        var changeEvent = new Event('change', { bubbles: true });
        checkbox.dispatchEvent(changeEvent);
        
        console.log('Checkbox', checkbox.value, 'changed from', wasChecked, 'to', checkbox.checked);
      });
      
      // Button text'ini güncelle
      var newText = allChecked ? 
        (chrome.i18n.getMessage('selectAll') || 'Tümünü Seç') : 
        (chrome.i18n.getMessage('deselectAll') || 'Hiçbirini Seçme');
      
      this.textContent = newText;
      console.log('Button text changed to:', newText);
    });
  }

  // Saniye input'una event listener ekle - placeholder'ları güncelle
  var secondsInput = document.getElementById('seconds');
  if (secondsInput) {
    secondsInput.addEventListener('input', function() {
      var newValue = this.value || '10';
      updateTabTimingPlaceholders(newValue);
    });
    
    secondsInput.addEventListener('change', function() {
      var newValue = this.value || '10';
      updateTabTimingPlaceholders(newValue);
    });
  }

  // Refresh All Tabs butonu event listener
  var refreshAllBtn = document.getElementById('refresh-all-tabs-btn');
  if (refreshAllBtn) {
    refreshAllBtn.addEventListener('click', function() {
      console.log('🔄 Refreshing tab list...');
      
      // Button'u disable et ve loading animasyonu ekle
      this.disabled = true;
      this.classList.add('loading');
      var originalText = this.innerHTML;
      var refreshingText = chrome.i18n.getMessage('refreshingTabList') || 'Yenileniyor...';
      this.innerHTML = refreshingText;
      
      // Sekme listesini yenile
      refreshTabList(function(success) {
        // Button'u normale döndür
        setTimeout(function() {
          refreshAllBtn.disabled = false;
          refreshAllBtn.classList.remove('loading');
          refreshAllBtn.innerHTML = originalText;
        }, 500);
        
        if (success) {
          var refreshedTitle = chrome.i18n.getMessage('toastListRefreshed') || 'Liste Yenilendi!';
          var refreshedMessage = chrome.i18n.getMessage('toastListRefreshedMessage') || 'Sekme listesi güncellendi.';
          showToast('success', refreshedTitle, refreshedMessage, 2000);
        } else {
          var errorTitle = chrome.i18n.getMessage('toastError') || 'Hata!';
          var refreshErrorMessage = chrome.i18n.getMessage('toastListRefreshError') || 'Sekme listesi yenilenemedi.';
          showToast('error', errorTitle, refreshErrorMessage, 2000);
        }
      });
    });
  }
});

// Ayarlara göre Tab Hopper'ı restart etme fonksiyonu
function restartTabHopperIfNeeded(settings) {
  console.log('🔄 Tab Hopper will be restarted with new settings:', settings);
  
  // Her durumda Tab Hopper'ı restart et (ayarları güncellemek için)
  console.log('⚡ Sending restart command with updated settings...');
  
  chrome.runtime.sendMessage({
    action: 'restartTabHopper',
    settings: settings
  }, function(response) {
    if (chrome.runtime.lastError) {
      console.error('❌ Could not restart Tab Hopper:', chrome.runtime.lastError.message);
      var restartErrorTitle = chrome.i18n.getMessage('toastRestartError') || 'Restart Hatası!';
      var restartErrorMessage = (chrome.i18n.getMessage('toastRestartErrorMessage') || 'Tab Hopper güncellenemedi:') + ' ' + chrome.runtime.lastError.message;
      showToast('error', restartErrorTitle, restartErrorMessage);
    } else if (response && response.success) {
      console.log('✅ Tab Hopper restarted successfully:', response);
      
      // Autostart durumuna göre mesaj
      if (settings.autostart) {
        var startedTitle = chrome.i18n.getMessage('toastTabHopperStarted') || 'Tab Hopper Başlatıldı!';
        var autoStartMessage = chrome.i18n.getMessage('toastAutoStartMessage') || 'Yeni ayarlarla otomatik olarak başlatıldı.';
        if (settings.inactive) {
          var inactiveModeMessage = chrome.i18n.getMessage('toastInactiveMode') || ' Sadece tarayıcı aktif değilken çalışacak.';
          autoStartMessage += inactiveModeMessage;
        }
        showToast('success', startedTitle, autoStartMessage, 3000);
      } else {
        var settingsUpdatedTitle = chrome.i18n.getMessage('toastSettingsUpdated') || 'Ayarlar Güncellendi';
        var manualStartMessage = chrome.i18n.getMessage('toastManualStart') || 'Tab Hopper durduruldu. Manuel olarak başlatabilirsiniz.';
        showToast('info', settingsUpdatedTitle, manualStartMessage, 3000);
      }
    } else {
      console.error('❌ Tab Hopper restart failed:', response);
      var restartErrorTitle = chrome.i18n.getMessage('toastRestartError') || 'Restart Hatası!';
      var unknownError = chrome.i18n.getMessage('toastUnknownError') || 'Bilinmeyen hata';
      var restartErrorMessage = (chrome.i18n.getMessage('toastRestartErrorMessage') || 'Tab Hopper güncellenemedi:') + ' ' + (response ? response.error : unknownError);
      showToast('error', restartErrorTitle, restartErrorMessage);
    }
  });
}

var saveInProgress = false; // Save işlemi devam ediyor mu

function save_options () {
  console.log('Save options called'); // Debug log
  
  // Eğer save işlemi zaten devam ediyorsa, tekrar çağrılmasını engelle
  if (saveInProgress) {
    console.log('Save already in progress, ignoring duplicate call');
    return;
  }
  
  saveInProgress = true;
  
  // Toast ile başlangıç mesajı göster
  var savingTitle = chrome.i18n.getMessage('toastSaving') || 'Kaydediliyor...';
  var savingMessage = chrome.i18n.getMessage('toastSavingMessage') || 'Ayarlarınız kaydediliyor, lütfen bekleyin.';
  showToast('info', savingTitle, savingMessage, 2000);
  
  var secondsElement = document.getElementById("seconds");
  var reloadElement = document.getElementById("reload");
  var inactiveElement = document.getElementById("inactive");
  var autostartElement = document.getElementById("autostart");
  
  if (!secondsElement || !reloadElement || !inactiveElement || !autostartElement) {
    console.error('Required elements not found');
    var errorTitle = chrome.i18n.getMessage('toastError') || 'Hata!';
    var elementsMessage = chrome.i18n.getMessage('toastElementsNotFound') || 'Gerekli form elemanları bulunamadı. Sayfayı yenileyin.';
    showToast('error', errorTitle, elementsMessage);
    saveInProgress = false; // Save işlemini tamamla
    return;
  }
  
  var seconds = parseInt(secondsElement.value || "10", 10);
  var reload = reloadElement.checked;
  var inactive = inactiveElement.checked;
  var autostart = autostartElement.checked;

  // Validasyon
  if (isNaN(seconds) || seconds < 1 || seconds > 300) {
    var invalidTitle = chrome.i18n.getMessage('toastInvalidValue') || 'Geçersiz Değer!';
    var invalidMessage = chrome.i18n.getMessage('toastInvalidSeconds') || 'Saniye değeri 1-300 arasında olmalıdır.';
    showToast('error', invalidTitle, invalidMessage);
    saveInProgress = false; // Save işlemini tamamla
    return;
  }

  // Tab-specific timing ayarlarını topla
  var tabTimings = {};
  var tabTimingsByUrl = {};
  var timingInputs = document.querySelectorAll('.tab-timing');
  timingInputs.forEach(function(input) {
    var tabId = input.getAttribute('data-tab-id');
    var tabUrl = input.getAttribute('data-tab-url');
    var value = parseInt(input.value);
    
    if (value && value >= 1 && value <= 300) {
      // ID bazlı kayıt (geriye uyumluluk)
      if (tabId) {
        tabTimings[tabId] = value;
      }
      
      // URL bazlı kayıt (yeni sistem)
      if (tabUrl) {
        var domain = getDomainFromUrl(tabUrl);
        tabTimingsByUrl[domain] = value;
        console.log('💾 Saving timing for domain:', domain, '=', value, 'seconds');
      }
    }
  });

  // Reload tab ayarlarını topla
  var reloadTabIds = [];
  var reloadUrlList = [];
  var checkboxes = document.querySelectorAll('#tab-list input[type="checkbox"]:checked');
  checkboxes.forEach(function(checkbox) {
    var tabId = parseInt(checkbox.value);
    var li = checkbox.closest('li');
    var tabUrl = li ? li.getAttribute('data-tab-url') : null;
    
    // ID bazlı kayıt (geriye uyumluluk)
    if (tabId) {
      reloadTabIds.push(tabId);
    }
    
    // URL bazlı kayıt (yeni sistem) 
    if (tabUrl) {
      var domain = getDomainFromUrl(tabUrl);
      if (reloadUrlList.indexOf(domain) === -1) {
        reloadUrlList.push(domain);
        console.log('💾 Saving reload setting for domain:', domain);
      }
    }
  });

  var settings = {
    seconds: parseInt(document.getElementById('seconds').value) || 10,
    reload: document.getElementById('reload').checked,
    inactive: document.getElementById('inactive').checked,
    autostart: document.getElementById('autostart').checked,
    reloadTabIds: reloadTabIds, // Geriye uyumluluk
    tabTimings: tabTimings, // Geriye uyumluluk
    reloadUrlList: reloadUrlList, // Yeni sistem
    tabTimingsByUrl: tabTimingsByUrl // Yeni sistem
  };

  console.log('Settings to save:', settings);

  try {
    // Chrome storage'a kaydet
    chrome.storage.sync.set(settings, function() {
      if (chrome.runtime.lastError) {
        console.error('Storage error:', chrome.runtime.lastError);
        var storageErrorTitle = chrome.i18n.getMessage('toastError') || 'Hata!';
        var storageErrorMessage = (chrome.i18n.getMessage('toastStorageError') || 'Ayarlar kaydedilemedi:') + ' ' + chrome.runtime.lastError.message;
        showToast('error', storageErrorTitle, storageErrorMessage);
        saveInProgress = false; // Hata durumunda flag'i resetle
      } else {
        console.log('Settings saved successfully');
        var successTitle = chrome.i18n.getMessage('toastSuccess') || 'Başarılı!';
        var successMessage = chrome.i18n.getMessage('toastSavedMessage') || 'Ayarlarınız başarıyla kaydedildi.';
        showToast('success', successTitle, successMessage);
        
        // Ayarları background'a gönder
        updateInstanceSettings(settings);
        
        // Ayarlara göre Tab Hopper'ı restart et
        setTimeout(function() {
          restartTabHopperIfNeeded(settings);
        }, 500); // Settings update'in tamamlanması için kısa bir bekleme
        
        // İşlem tamamlandığında flag'i resetle
        setTimeout(function() {
          saveInProgress = false;
        }, 1000);
      }
    });
    
  } catch (error) {
    console.error('Save error:', error);
    var unexpectedErrorTitle = chrome.i18n.getMessage('toastError') || 'Hata!';
    var unexpectedErrorMessage = chrome.i18n.getMessage('toastUnexpectedError') || 'Ayarlar kaydedilirken bir hata oluştu.';
    showToast('error', unexpectedErrorTitle, unexpectedErrorMessage);
    saveInProgress = false; // Hata durumunda flag'i resetle
  }
}

// URL'den domain çıkarma fonksiyonu
function getDomainFromUrl(url) {
  try {
    if (!url || url.startsWith('chrome://') || url.startsWith('chrome-extension://')) {
      return url; // Özel protokoller için tam URL'i döndür
    }
    var urlObj = new URL(url);
    return urlObj.hostname;
  } catch (error) {
    return url; // Parse edilemeyen URL'ler için tam URL'i döndür
  }
}

// Sekme listesini yenileme fonksiyonu
function refreshTabList(callback) {
  console.log('🔄 Refreshing tab list with current window tabs...');
  
  try {
    chrome.tabs.query({currentWindow: true}, function(tabs) {
      if (chrome.runtime.lastError) {
        console.error('❌ Could not query tabs:', chrome.runtime.lastError.message);
        if (callback) callback(false);
        return;
      }
      
      console.log('📋 Found', tabs.length, 'tabs in current window');
      
      // Mevcut ayarları al
      chrome.storage.sync.get(['reloadTabIds', 'tabTimings', 'seconds', 'reloadUrlList', 'tabTimingsByUrl'], function(settings) {
        if (chrome.runtime.lastError) {
          console.error('❌ Could not get settings:', chrome.runtime.lastError.message);
          if (callback) callback(false);
          return;
        }
        
        var existingReloadIds = settings.reloadTabIds || [];
        var existingTimings = settings.tabTimings || {};
        var reloadUrlList = settings.reloadUrlList || [];
        var tabTimingsByUrl = settings.tabTimingsByUrl || {};
        var defaultSeconds = settings.seconds || 10;
        
        // Tab listesini temizle
        var tabList = document.getElementById('tab-list');
        if (tabList) {
          tabList.innerHTML = '';
        }
        
        // Yeni sekmeleri ekle
        tabs.forEach(function(tab) {
          var li = document.createElement('li');
          li.setAttribute('data-tab-id', tab.id);
          li.setAttribute('data-tab-url', tab.url);
          
          // URL bazlı ayar kontrolü (yeni sistem)
          var tabUrl = tab.url || '';
          var urlDomain = getDomainFromUrl(tabUrl);
          var isCheckedByUrl = reloadUrlList.indexOf(tabUrl) > -1 || reloadUrlList.indexOf(urlDomain) > -1;
          var timingByUrl = tabTimingsByUrl[tabUrl] || tabTimingsByUrl[urlDomain] || '';
          
          // Geçici ID bazlı ayar kontrolü (mevcut sistem - geriye uyumluluk)
          var isCheckedById = existingReloadIds.indexOf(tab.id) > -1;
          var timingById = existingTimings[tab.id] || '';
          
          // URL bazlı ayarı öncelikle al, yoksa ID bazlı ayarı al
          var isChecked = isCheckedByUrl || isCheckedById;
          var tabTiming = timingByUrl || timingById;
          var checked = isChecked ? 'checked' : '';
          
          console.log('📋 Tab:', tab.title, 'URL:', urlDomain, 'Reload:', isChecked, 'Timing:', tabTiming);
          
          // Varsayılan saniye değerini al
          var defaultSecondsValue = document.getElementById('seconds') ? document.getElementById('seconds').value : '10';
          var placeholderText = defaultSecondsValue || '10';
          
          li.innerHTML =
            '<span class="tab-title">' + tab.title + '</span>' +
            '<div class="tab-reload-column">' +
              '<label class="switch">' +
                '<input type="checkbox" value="' + tab.id + '" ' + checked + ' />' +
                '<span class="slider"></span>' +
              '</label>' +
            '</div>' +
            '<div class="tab-timing-column">' +
              '<input type="number" class="tab-timing" placeholder="' + placeholderText + '" ' +
              'min="1" max="300" value="' + tabTiming + '" data-tab-id="' + tab.id + '" data-tab-url="' + tabUrl + '" />' +
            '</div>';
          
          // Event listener'ları ekle
          addTabEventListeners(li);
          
          tabList.appendChild(li);
          
          // Eğer seçili ise görsel olarak belirt
          if (isChecked) {
            li.classList.add('selected');
          }
        });
        
        // Tab sayacını güncelle
        updateTabCounter();
        
        console.log('✅ Tab list refreshed successfully');
        if (callback) callback(true);
      });
    });
  } catch (error) {
    console.error('❌ Error refreshing tab list:', error);
    if (callback) callback(false);
  }
}

// Tab timing placeholder'larını güncelleme fonksiyonu
function updateTabTimingPlaceholders(newValue) {
  var timingInputs = document.querySelectorAll('.tab-timing');
  timingInputs.forEach(function(input) {
    input.placeholder = newValue;
  });
}

// Tab event listener'larını ekleme fonksiyonu
function addTabEventListeners(li) {
  // Click event'ini kaldırdık - sekmeye tıklayınca artık tab'a gitmiyor
  
  // Checkbox'ın change event'ini dinle
  var checkbox = li.querySelector('input[type="checkbox"]');
  if (checkbox) {
    checkbox.addEventListener('change', function() {
      if (this.checked) {
        li.classList.add('selected');
      } else {
        li.classList.remove('selected');
      }
      updateTabCounter();
    });
  }

            // Timing input event listener
  var timingInput = li.querySelector('.tab-timing');
  if (timingInput) {
    timingInput.addEventListener('input', function() {
      var value = parseInt(this.value);
      if (value && (value < 1 || value > 300)) {
        this.classList.add('error');
        this.classList.remove('success');
        var invalidMessage = chrome.i18n.getMessage('validationInvalidTiming') || 'Geçersiz değer! 1-300 arasında olmalı.';
        this.title = invalidMessage;
      } else if (value) {
        this.classList.add('success');
        this.classList.remove('error');
        var timingUnit = chrome.i18n.getMessage('validationTimingTitle') || 'saniye';
        this.title = value + ' ' + timingUnit;
      } else {
        this.classList.remove('error', 'success');
        var defaultMessage = chrome.i18n.getMessage('validationDefaultTiming') || 'Varsayılan süre kullanılacak';
        this.title = defaultMessage;
      }
    });
  }
}

