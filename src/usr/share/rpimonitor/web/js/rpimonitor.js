// This file is part of RPi-Monitor project
//
// Copyright 2013-2026 - Xavier Berger - http://rpi-experiences.blogspot.fr/
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.

/**
 * Core RPi-Monitor module.
 * @module rpimonitor
 */
(function() {
  'use strict';

  var animate;
  var shellinaboxuri;
  var statusautorefresh;
  var refreshTimerId;

  var rpimonitorWS = null;
  var rpimonitorWSCallbacks = [];

  function rpimonitorSubscribe(callback) {
    rpimonitorWSCallbacks.push(callback);
    if (!rpimonitorWS) {
      var wsUrl = (location.protocol === 'https:' ? 'wss:' : 'ws:') + '//' + location.host + '/ws';
      try {
        rpimonitorWS = new WebSocket(wsUrl);
        rpimonitorWS.onmessage = function(event) {
          try {
            var data = JSON.parse(event.data);
            for (var i = 0; i < rpimonitorWSCallbacks.length; i++) {
              rpimonitorWSCallbacks[i](data);
            }
          } catch (e) { /* ignore parse errors */ }
        };
        rpimonitorWS.onclose = function() { rpimonitorWS = null; };
        rpimonitorWS.onerror = function() { rpimonitorWS = null; };
      } catch (e) {
        rpimonitorWS = null;
      }
    }
  }

  var clickId;
  var current_path = window.location.pathname.split('/').pop();

/**
 * Get a URL query parameter by name.
 * @param {string} sParam - The parameter name to look up.
 * @returns {string|undefined} The parameter value, or undefined if not found.
 */
  function GetURLParameter(sParam)
  {
    var sPageURL = window.location.search.substring(1);
    var sURLVariables = sPageURL.split('&');
    for (var i = 0; i < sURLVariables.length; i++)
    {
      var sParameterName = sURLVariables[i].split('=');
      if (sParameterName[0] == sParam)
      {
        return sParameterName[1];
      }
    }
  }

/**
 * Fetch JSON data from the server with localStorage caching.
 * @param {string} name - The data source name (e.g. 'static', 'dynamic').
 * @returns {Object|null} Parsed JSON data, or null on failure.
 */
  function getData( name ){
  if ( localStorage.getItem(name+'Version') == localStorage.getItem('version') ) {
    return JSON.parse(localStorage.getItem(name));
  }
  else
  {
    return $.ajax({
      url: name + '.json',
      dataType: 'json',
      async: false,
      success: function(data) {
        localStorage.setItem(name, JSON.stringify(data))
        localStorage.setItem(name+'Version', localStorage.getItem('version'))
        return data
      },
      fail: function () {
        $('#message').html(`<b>Can not get information (<a href='${name}.json'>${name}.json</a>) from RPi-Monitor server.</b>`);
        $('#message').removeClass('hide');
        return null
      }
    }).responseJSON
  }
}

/**
 * Render the friends list in the footer area.
 * @returns {void}
 */
  function ShowFriends(){
    var data = getData('friends');
    if ( data.length > 0 ) {
      $('#friends').empty();
      for (var i = 0; i < data.length; i++) {
        $('#friends').append(`<li><a href="${data[i].link}">${safeEval(data[i].title, {data: getData('static')})}</a></li>`);
      }
      $('#divfriends').removeClass('hide');
    }
  }

/**
 * Render the fixed bottom navbar footer.
 * @returns {void}
 */
  function AddFooter(){
    $('#footer').html(
      `<div class="navbar fixed-bottom text-center">` +
      `<small>` +
      `<a href="https://rpi-experiences.blogspot.com/">RPi-Experiences</a>` +
      ` <span>|</span> ` +
      `<a href="https://github.com/XavierBerger/RPi-Monitor">GitHub</a>` +
      ` <span>|</span> ` +
      `<a href="https://www.raspberrypi.org/">Raspberry Pi Foundation</a>` +
      `</small>` +
      `</div>`
    );
  }

/**
 * Build and inject the About and Options modal dialogs.
 * @returns {void}
 */
  function AddDialogs(){
    var dialogs = ``;

    dialogs += `<div id="Options" class="modal fade">` +
      `<div class="modal-dialog"><div class="modal-content">` +
      `<div class="modal-header">` +
      `<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>` +
      `<h4 id="myModalLabel" class="modal-title">Options</h4>` +
      `</div>` +
      `<div class="modal-body"><i id="optionsInsertionPoint"></i></div>` +
      `<div class="modal-footer">` +
      `<button class="btn btn-secondary" data-bs-dismiss="modal" id="closeoptions">Close</button>` +
      `</div></div></div></div>`;

    dialogs += `<div id="License" class="modal fade">` +
      `<div class="modal-dialog"><div class="modal-content">` +
      `<div class="modal-header">` +
      `<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>` +
      `<h4 id="myModalLabel" class="modal-title">License</h4>` +
      `</div>` +
      `<div class="modal-body">` +
      `This program is free software: you can redistribute it and/or modify ` +
      ` of the GNU General Public License as published ` +
      `by the Free Software Foundation, either version 3 of the License, or ` +
      `(at your option) any later version.<br><br>` +
      `This program is distributed in the hope that it will be useful, but ` +
      `WITHOUT ANY WARRANTY; without even the implied warranty of ` +
      `MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. ` +
      `See the GNU General Public License for more details.<br><br>` +
      `You should have received a copy of the GNU General Public License ` +
      `along with this program. If not, see <a href="http://www.gnu.org/licenses/">http://www.gnu.org/licenses/</a>.` +
      `</p><hr>` +
      `<b>RPi-Monitor</b> is using third party software that have their own licenses. ` +
      `Refer to <a href="#About" data-bs-dismiss="modal" data-bs-toggle="modal">About</a> to view the list of software used by <b>RPi-Monitor</b>. ` +
      `</div>` +
      `<div class="modal-footer">` +
      `<button class="btn btn-secondary" data-bs-dismiss="modal">Close</button>` +
      `</div></div></div></div>`;

    dialogs += `<div id="About" class="modal fade">` +
      `<div class="modal-dialog"><div class="modal-content">` +
      `<div class="modal-header">` +
      `<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>` +
      `<h4 id="myModalLabel" class="modal-title">About</h4>` +
      `</div>` +
      `<div class="modal-body">` +
      `<p><b>Version</b>: {DEVELOPMENT} <b>by</b> Xavier Berger</p>` +
      `With the contribution of users sharing ideas and competences on Github.<br>` +
      `<a href="https://rpi-experiences.blogspot.com/">Blog</a> - ` +
      `<a href="https://github.com/XavierBerger/RPi-Monitor">GitHub</a> - ` +
      `<a href="https://xavierberger.github.io/RPi-Monitor-docs/index.html">Documentation</a>` +
      `<hr>` +
      `<p><b>RPi-Monitor</b> is free software developed on top of other open source ` +
      `tools: <a href="https://getbootstrap.com/">Bootstrap</a>, <a href="https://jquery.com/">jQuery</a>, <a href="https://www.chartjs.org/">Chart.js</a>, <a href="https://github.com/davidshimjs/qrcodejs">qrcodejs</a>, <a href="https://icons.getbootstrap.com/">Bootstrap Icons</a>.<br>` +
      `<p><b>Raspberry Pi</b> and the Raspberry Pi logo are properties of <a href="https://www.raspberrypi.org/">Raspberry Pi Foundation</a>.</p>` +
      `</div>` +
      `<div class="modal-footer">` +
      `<button class="btn btn-secondary" data-bs-dismiss="modal">Close</button>` +
      `</div></div></div></div>`;

    $('#dialogs').html(dialogs);
  }

/**
 * Build and inject the top navigation bar menu.
 * @returns {void}
 */
  function AddTopmenu(){
    var page = getData('page');
    var data = getData('static');
    var icon, menutitle;
    try { document.title = safeEval(page.pagetitle, {data: data}); }
    catch (err) { document.title = page.pagetitle; }
    try { icon = safeEval(page.icon, {data: data}); }
    catch (err) { icon = page.icon; }
    try { menutitle = safeEval(page.menutitle, {data: data}); }
    catch (err) { menutitle = page.menutitle; }
    var topmenu =
      `<nav class="navbar navbar-expand-md fixed-top" data-bs-theme="dark">` +
      `<div class="container-fluid">` +
      `<a class="navbar-brand" href="index.html"><img height="24" src="${icon}"> ${menutitle}</a>` +
      `<button type="button" class="navbar-toggler" data-bs-toggle="collapse" data-bs-target="#navbarMain">` +
      `<span class="navbar-toggler-icon"></span></button>` +
      `<div class="collapse navbar-collapse" id="navbarMain">` +
      `<ul class="navbar-nav me-auto">` +
      `<li id="statusmenu" class="nav-item"><a id="statuslink" class="nav-link" href="status.html"><i class="bi bi-speedometer2"></i> Status</a></li>` +
      `<li id="statisticsmenu" class="nav-item"><a id="statisticslink" class="nav-link" href="statistics.html"><i class="bi bi-graph-up-arrow"></i> Statistics</a></li>` +
      `<li id="addonsmenu" class="nav-item hide"><a id="addonslink" class="nav-link" href="addons.html"><i class="bi bi-puzzle"></i> Add-ons</a></li>` +
      `<li id="optionsmenu" class="nav-item"><a class="nav-link" href="#Options" data-bs-toggle="modal"><i class="bi bi-gear"></i> Options</a></li>` +
      `<li class="nav-item dropdown">` +
      `<a href="#" class="nav-link dropdown-toggle" data-bs-toggle="dropdown"><i class="bi bi-info-circle"></i> About</a>` +
      `<ul class="dropdown-menu">` +
      `<li><h6 class="dropdown-header">RPi-Monitor</h6></li>` +
      `<li><a class="dropdown-item" href="#" title="Scan this qrcode to reach this page from your smartphone or tablet"><canvas id="qrcanv"></canvas></a></li>` +
      `<li><a class="dropdown-item" href="#License" data-bs-toggle="modal"><i class="bi bi-file-earmark-text"></i> License</a></li>` +
      `<li><a class="dropdown-item" href="#About" data-bs-toggle="modal"><i class="bi bi-info-square"></i> About</a></li>` +
      `<li><hr class="dropdown-divider"></li>` +
      `<li><h6 class="dropdown-header">Related links</h6></li>` +
      `<li><a class="dropdown-item" href="https://xavierberger.github.io/RPi-Monitor-docs/index.html"><i class="bi bi-book"></i> Documentation</a></li>` +
      `<li><a class="dropdown-item" href="https://rpi-experiences.blogspot.com/"><i class="bi bi-link-45deg"></i> RPi-Experiences</a></li>` +
      `<li><a class="dropdown-item" href="https://github.com/XavierBerger/RPi-Monitor"><i class="bi bi-github"></i> GitHub</a></li>` +
      `</ul></li></ul>` +
      `<div class="float-end hide" id="divfriends">` +
      `<ul class="navbar-nav"><li class="nav-item dropdown">` +
      `<a href="#" class="nav-link dropdown-toggle" data-bs-toggle="dropdown"><i class="bi bi-people"></i> Friends</a>` +
      `<ul class="dropdown-menu dropdown-menu-end" id="friends"></ul>` +
      `</li></ul></div>` +
      `<div id="rpm-clock" class="ms-2"></div>` +
      `</div></div></nav>`;
    $('#topmenu').html(topmenu);
  }

  function UpdateMenu(){
    var index = false;

    if (current_path == 'status.html'){ $('#statusmenu').addClass('active'); index = false; }
    else if (current_path == 'statistics.html'){ $('#statisticsmenu').addClass('active'); index = false; }
    else if (current_path == 'addons.html'){ $('#addonsmenu').addClass('active'); index = false; }

    if ( index == true ) {
      $('#statusmenu').addClass('hide');
      $('#statisticsmenu').addClass('hide');
      $('#addonsmenu').addClass('hide');
      $('#optionsmenu').addClass('hide');
      return;
    }

    var data = getData('menu');
    if ( data.status == undefined ) {
      $('#statusmenu').addClass('hide');
    }
    else {
      if ( data.status.length > 1 ){
        $('#statusmenu').addClass('dropdown');
        var dropDownMenu = `<ul class="dropdown-menu">`;
        for ( var iloop = 0; iloop < data.status.length; iloop++ ){
          dropDownMenu += `<li><a href="status.html?activePage=${iloop}">${safeEval(data.status[iloop], {data: getData('static')})}</a></li>`;
        }
        dropDownMenu += `</ul>`;
        $('#statuslink').html(`Status <span class="caret"></span>`);
        $(dropDownMenu).insertAfter('#statuslink');
        $('#statuslink').addClass('dropdown-toggle');
        $('#statuslink').attr('data-bs-toggle','dropdown');
        $('#statuslink').attr('href','#');
      }
    }

    if ( data.statistics == undefined ) {
      $('#statisticsmenu').addClass('hide');
    }
    else {
      if ( data.statistics.length > 1 ){
        $('#statisticsmenu').addClass('dropdown');
        var dropDownMenu = `<ul class="dropdown-menu">`;
        for ( var iloop = 0; iloop < data.statistics.length; iloop++ ){
          dropDownMenu += `<li><a href="statistics.html?activePage=${iloop}">${safeEval(data.statistics[iloop], {data: getData('static')})}</a></li>`;
        }
        dropDownMenu += `</ul>`;
        $('#statisticslink').html(`Statistics <span class="caret"></span>`);
        $(dropDownMenu).insertAfter('#statisticslink');
        $('#statisticslink').addClass('dropdown-toggle');
        $('#statisticslink').attr('data-bs-toggle','dropdown');
        $('#statisticslink').attr('href','#');
      }
    }

    if ( data.addons != undefined ) {
      if ( data.addons.length > 0 ){
        $('#addonsmenu').removeClass('hide');
        $('#addonslink').html(safeEval(data.addons[0], {data: getData('static')}));
      }
      if ( data.addons.length > 1 ){
        $('#addonsmenu').addClass('dropdown');
        var dropDownMenu = `<ul class="dropdown-menu">`;
        for ( var iloop = 0; iloop < data.addons.length; iloop++ ){
          dropDownMenu += `<li><a href="addons.html?activePage=${iloop}">${safeEval(data.addons[iloop], {data: getData('static')})}</a></li>`;
        }
        dropDownMenu += `</ul>`;
        $('#addonslink').html(`Add-ons <span class="caret"></span>`);
        $(dropDownMenu).insertAfter('#addonslink');
        $('#addonslink').addClass('dropdown-toggle');
        $('#addonslink').attr('data-bs-toggle','dropdown');
        $('#addonslink').attr('href','#');
      }
    }
  }

  function getVersion(){
    $.ajax({
      url: 'version.json',
      dataType: 'json',
      async: false,
      success: function(data) {
        localStorage.setItem('version', data.version);
      }
    });
  }

  function ShowTestModeBanner(){
    var data = getData('static');
    if ( data && data.testmode ) {
      var banner = $(
        `<div class="testmode-banner">` +
        `<span class="testmode-icon">&#9888;</span>` +
        `<strong>Testing Mode</strong> &mdash; Running on a non-Raspberry Pi environment. ` +
        `Some hardware-specific data may not be available.</div>`
      );
      $('#topmenu').after(banner);
      $('body').addClass('testmode-active');
    }
  }

/**
 * Set up the QR code dialog in the footer area.
 * Creates a hidden dialog with a QR code container.
 * @returns {void}
 */
  function setupqr(){
    if ( $('#qrdialog').length === 0 ) {
      $('#dialogs').append(
        `<div class="modal fade" id="qrdialog" tabindex="-1" aria-labelledby="qrLabel" aria-hidden="true">` +
        `<div class="modal-dialog modal-sm"><div class="modal-content">` +
        `<div class="modal-header"><h5 class="modal-title" id="qrLabel">QR Code</h5>` +
        `<button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>` +
        `<div class="modal-body text-center"><div id="qrcode"></div></div>` +
        `</div></div></div>`
      );
    }
  }

/**
 * Generate and display a QR code for the given URL.
 * @param {string} url - The URL to encode in the QR code.
 * @returns {void}
 */
  function doqr(url){
    $('#footer').append(`<a href="#" id="qrlink" class="qr-link" title="Show QR Code">` +
      `<i class="bi bi-qr-code"></i></a>`);

    $('#qrlink').off('click').on('click', function(e) {
      e.preventDefault();
      $('#qrcode').empty();
      if (typeof QRCode !== 'undefined') {
        new QRCode(document.getElementById('qrcode'), {
          text: url,
          width: 200,
          height: 200,
          correctLevel: QRCode.CorrectLevel.M
        });
      }
      var qrModal = new bootstrap.Modal(document.getElementById('qrdialog'));
      qrModal.show();
    });
  }

  function StartClock(){
    function tick() {
      var now = new Date();
      var h = String(now.getHours()).padStart(2,'0');
      var m = String(now.getMinutes()).padStart(2,'0');
      var s = String(now.getSeconds()).padStart(2,'0');
      var el = document.getElementById('rpm-clock');
      if (el) el.innerHTML = '<span>'+h+'</span>:<span>'+m+'</span>:<span>'+s+'</span>';
    }
    tick();
    setInterval(tick, 1000);
  }

  function AddStatusBadge(){
    var badge = `<li class="nav-item d-flex align-items-center"><span class="rpm-status-badge" id="rpm-status-badge"><span class="dot"></span> Online</span></li>`;
    $('#navbarMain').find('.navbar-nav').first().append(badge);
    $.getJSON('dynamic.json', function(){ $('#rpm-status-badge').html('<span class="dot"></span> Online'); })
      .fail(function(){ $('#rpm-status-badge').addClass('offline').html('<span class="dot"></span> Offline'); });
  }

  function AddThemeToggle(){
    var current = localStorage.getItem('rpm-theme') || 'dark';
    document.documentElement.setAttribute('data-bs-theme', current);
    var icon = current === 'dark' ? 'bi-sun' : 'bi-moon-stars';
    var btn = `<button class="rpm-theme-toggle" id="rpm-theme-toggle" title="Toggle theme"><i class="bi ${icon}"></i></button>`;
    $('#navbarMain').find('.navbar-nav').first().after('<div class="d-flex align-items-center ms-2">' + btn + '</div>');
    $('#rpm-theme-toggle').on('click', function(){
      var cur = document.documentElement.getAttribute('data-bs-theme') || 'dark';
      var next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-bs-theme', next);
      localStorage.setItem('rpm-theme', next);
      var ic = next === 'dark' ? 'bi-sun' : 'bi-moon-stars';
      $(this).html('<i class="bi ' + ic + '"></i>');
    });
  }

  function AddKeyboardShortcuts(){
    $(document).on('keydown', function(e){
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      var path = window.location.pathname.split('/').pop();
      switch(e.key.toLowerCase()){
        case 's': if (path !== 'status.html') window.location.href = 'status.html'; break;
        case 'g': if (path !== 'statistics.html') window.location.href = 'statistics.html'; break;
        case 'a': if (path !== 'addons.html') window.location.href = 'addons.html'; break;
        case 'h': if (path !== 'index.html') window.location.href = 'index.html'; break;
        case '?': $('#About').modal('show'); break;
      }
    });
  }

  $(function () {
    if ( localStorage == null ) {
      alert(`TypeError: localStorage is null\n\nActivate HTML5 localStorage before continuing.`);
    }

    getVersion();
    AddTopmenu();
    ShowTestModeBanner();
    AddDialogs();
    AddFooter();
    UpdateMenu();
    AddStatusBadge();
    AddThemeToggle();
    StartClock();
    AddKeyboardShortcuts();

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js').catch(function() {});
    }
  });

  // Expose to global scope for legacy compatibility
  window.rpimonitorSubscribe = rpimonitorSubscribe;
  window.GetURLParameter = GetURLParameter;
  window.getData = getData;
  window.ShowFriends = ShowFriends;
  window.AddFooter = AddFooter;
  window.AddDialogs = AddDialogs;
  window.AddTopmenu = AddTopmenu;
  window.UpdateMenu = UpdateMenu;
  window.getVersion = getVersion;
  window.ShowTestModeBanner = ShowTestModeBanner;
  window.setupqr = setupqr;
  window.doqr = doqr;
  window.animate = animate;
  window.statusautorefresh = statusautorefresh;
  window.StartClock = StartClock;
  window.AddStatusBadge = AddStatusBadge;
  window.AddThemeToggle = AddThemeToggle;
  window.AddKeyboardShortcuts = AddKeyboardShortcuts;
})();
