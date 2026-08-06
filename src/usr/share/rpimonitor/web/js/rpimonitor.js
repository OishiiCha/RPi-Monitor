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
      `<div class="navbar navbar-dark bg-dark fixed-bottom text-center">` +
      `<small class="text-secondary">` +
      `<a href="https://rpi-experiences.blogspot.com/">RPi-Experiences</a>` +
      ` <span class="text-secondary">|</span> ` +
      `<a href="https://github.com/XavierBerger/RPi-Monitor">GitHub</a>` +
      ` <span class="text-secondary">|</span> ` +
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
      `tools: <a href="https://getbootstrap.com/">Bootstrap</a>, <a href="https://jquery.com/">jQuery</a>, <a href="https://www.chartjs.org/">Chart.js</a>, <a href="https://github.com/davidshimjs/qrcodejs">qrcodejs</a>.<br>` +
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
      `<nav class="navbar navbar-dark bg-dark fixed-top" data-bs-theme="dark">` +
      `<div class="container-fluid">` +
      `<div class="navbar-header">` +
      `<button type="button" class="navbar-toggler collapsed" data-bs-toggle="collapse" data-bs-target="#bs-example-navbar-collapse-1">` +
      `<span class="navbar-toggler-icon"></span></button>` +
      `<a class="navbar-brand" href="index.html"><img height="20" src="${icon}"> &nbsp;${menutitle}</a>` +
      `</div>` +
      `<div class="collapse navbar-collapse" id="bs-example-navbar-collapse-1">` +
      `<ul class="navbar-nav">` +
      `<li id="statusmenu" class="nav-item"><a id="statuslink" class="nav-link" href="status.html">Status</a></li>` +
      `<li id="statisticsmenu" class="nav-item"><a id="statisticslink" class="nav-link" href="statistics.html">Statistics</a></li>` +
      `<li id="addonsmenu" class="nav-item hide"><a id="addonslink" class="nav-link" href="addons.html">Add-ons</a></li>` +
      `<li id="optionsmenu" class="nav-item"><a class="nav-link" href="#Options" data-bs-toggle="modal">Options</a></li>` +
      `<li class="nav-item dropdown">` +
      `<a href="#" class="nav-link dropdown-toggle" data-bs-toggle="dropdown">About</a>` +
      `<ul class="dropdown-menu">` +
      `<li><h6 class="dropdown-header">RPi-Monitor</h6></li>` +
      `<li><a class="dropdown-item" href="#" title="Scan this qrcode to reach this page from your smartphone or tablet"><canvas id="qrcanv"></canvas></a></li>` +
      `<li><a class="dropdown-item" href="#License" data-bs-toggle="modal">License</a></li>` +
      `<li><a class="dropdown-item" href="#About" data-bs-toggle="modal">About</a></li>` +
      `<li><hr class="dropdown-divider"></li>` +
      `<li><h6 class="dropdown-header">Related links</h6></li>` +
      `<li><a class="dropdown-item" href="https://xavierberger.github.io/RPi-Monitor-docs/index.html">Documentation</a></li>` +
      `<li><a class="dropdown-item" href="https://rpi-experiences.blogspot.com/">RPi-Experiences</a></li>` +
      `<li><a class="dropdown-item" href="https://github.com/XavierBerger/RPi-Monitor">RPi-Monitor on GitHub</a></li>` +
      `</ul></li></ul>` +
      `<div class="float-end hide" id="divfriends">` +
      `<ul class="navbar-nav"><li class="nav-item dropdown">` +
      `<a href="#" class="nav-link dropdown-toggle" data-bs-toggle="dropdown">Friends</a>` +
      `<ul class="dropdown-menu dropdown-menu-end" id="friends"></ul>` +
      `</li></ul></div>` +
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
      `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" ` +
      `class="bi bi-qr-code" viewBox="0 0 16 16">` +
      `<path d="M2 2a0 0 0 0 1 0 0v2a0 0 0 0 1-0 0H4a0 0 0 0 1-0 0V2a0 0 0 0 0-1-0 0H2Zm6 0a0 0 0 0 0-1 0 0v2a0 0 0 0 1 0 0h2a0 0 0 0 1-0 0V2a0 0 0 0 0-1-0 0H8ZM2 8a0 0 0 0 0-1 0 0v2a0 0 0 0 1 0 0h2a0 0 0 0 1-0 0V8a0 0 0 0 0-1-0 0H2Zm6 0a0 0 0 0 0-1 0 0v2a0 0 0 0 1 0 0h.5a0 0 0 0 1-0 0V8a0 0 0 0 0-1-0 0H8ZM8 12a0 0 0 0 0-1 0 0v.5a0 0 0 0 1 0 0h.5a0 0 0 0 1-0 0V12a0 0 0 0 0-1-0 0H8Zm2-4a0 0 0 0 0-1 0 0v.5a0 0 0 0 1 0 0H12a0 0 0 0 1-0 0V8a0 0 0 0 0-1-0 0H10Zm2-6a0 0 0 0 0-1 0 0v2a0 0 0 0 1 0 0h2a0 0 0 0 1-0 0V2a0 0 0 0 0-1-0 0H12Zm0 6a0 0 0 0 0-1 0 0v2a0 0 0 0 1 0 0h2a0 0 0 0 1-0 0V8a0 0 0 0 0-1-0 0H12Zm-4 4a0 0 0 0 0-1 0 0v2a0 0 0 0 1 0 0h2a0 0 0 0 1-0 0V12a0 0 0 0 0-1-0 0H8Zm-6 0a0 0 0 0 0-1 0 0v2a0 0 0 0 1 0 0h2a0 0 0 0 1-0 0V12a0 0 0 0 0-1-0 0H2Z"/>` +
      `</svg></a>`);

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
})();
