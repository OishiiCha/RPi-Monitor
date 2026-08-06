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
 * Status page module.
 * @module rpimonitor.status
 */
(function() {
  'use strict';

  var strips;
  var animate;
  var statusautorefresh;
  var refreshTimerId;
  var clockId;

  function RowTemplate(id,image,title){
    var iconClass = 'bi bi-card-text';
    var imgName = (image || '').replace(/^img\//, '').replace(/\.(png|jpg|svg)$/, '');
    var iconMap = {
      'cpu': 'bi-cpu', 'cpu_temp': 'bi-thermometer-half', 'memory': 'bi-memory',
      'swap': 'bi-hdd-stack', 'sd': 'bi-sd-card', 'usb_hdd': 'bi-hdd',
      'network': 'bi-ethernet', 'wifi': 'bi-wifi', 'uptime': 'bi-clock-history',
      'pmu': 'bi-power', 'daemons': 'bi-gear', 'version': 'bi-tag',
      'user': 'bi-person', 'avatar': 'bi-person-circle', 'ok': 'bi-check-circle',
      'warning': 'bi-exclamation-triangle', 'timesync': 'bi-clock',
      'tor': 'bi-shield', 'printer': 'bi-printer', 'logo': 'bi-house'
    };
    if (iconMap[imgName]) { iconClass = 'bi ' + iconMap[imgName]; }
    return `<div data-id='${id}' class='row row${id} list-group-item' style='border: none'>` +
      `<div class='Title' draggable='false'>` +
      `<i class='${iconClass}' style='font-size:1.3rem;color:var(--rpm-accent)'></i> ${title}` +
      `</div>` +
      `<div class='Text' id='Text${id}' draggable='false'><b></b></div>` +
      `</div>`;
  }

  function ActivatePopover(){
    var info;
    while((info=window.postProcessInfo.pop()) != null) {
      var el = document.querySelector(info[0]);
      if (el) {
        new bootstrap.Popover(el, {trigger:'hover',placement:'bottom',html:true, title: info[1], content: info[2]});
      }
    }
    var pkgEl = document.getElementById("packages");
    if (pkgEl) {
      new bootstrap.Popover(pkgEl);
    }
  }

  function RenderStatus(data) {
    $.extend(true, data, getData('static'));
    $('#message').addClass('hide');

    for (var iloop=0; iloop < strips.length; iloop++){
      var visibility = safeEval(strips[iloop].visibility, {data: data});
      if ( visibility == 0) {
        $(`.row${iloop}`).addClass('hide');
      }
      else {
        $(`.row${iloop}`).removeClass('hide');
      }
      var text = "";
      for (var jloop=0; jloop < strips[iloop].line.length; jloop++){
        var line = strips[iloop].line[jloop];
        text += `<p>`;
        try {
          text += safeEval(line, {data: data});
        }
        catch (e) {
          text += `ERROR: ${line} -> ${e}`;
        }
        finally {
          text += `</p>`;
        }
      }
      $(`#Text${iloop}`).html(text);
    }

    var command;
    while((command=window.postProcessCommand.pop()) != null) {
      safeEvalStmt(command);
    }

    ActivatePopover();
  }

  function UpdateStatus () {
    ShowRefreshAnimation();
    window.justgageId = 0;
    $("#packages").empty();

    if (typeof rpimonitorSubscribe === 'function' && !window._rpimonitorWSSubscribed) {
      window._rpimonitorWSSubscribed = true;
      rpimonitorSubscribe(function(data) {
        window.justgageId = 0;
        $("#packages").empty();
        RenderStatus(data);
      });
    }

    $.getJSON('dynamic.json', function(data) {
      RenderStatus(data);
    })
    .fail(function() {
      $('#message').html(`<b>ERROR</b>: Can not get information (dynamic.json) from <b>RPi-Monitor</b> server.`);
      $('#message').removeClass('hide');
    });
  }

  function ConstructPage()
  {
    var activePage = GetURLParameter('activePage');
    if (activePage == null){ activePage = 0; }

    var data = getData('status');
    if ( ( typeof activePage == 'undefined') ||
         ( activePage >= data.length ) ) {
      activePage=0;
    }
    if ( data.length > 1 ) {
      $('#pageTitle').html(`<h2>${safeEval(data[activePage].title, {data: getData('static')})}</h2>`);
      $('#pageTitle').removeClass('hide');
    }
    for ( var iloop=0; iloop < data[activePage].content.length; iloop++) {
      var title;
      if ( typeof data[activePage].content[iloop].title != 'undefined' ){
        title = safeEval(data[activePage].content[iloop].title, {data: getData('static')});
      }
      else {
        title = data[activePage].content[iloop].name;
      }
      $(RowTemplate(iloop, `img/${data[activePage].content[iloop].icon}`, title)).insertBefore("#insertionPoint");
      strips=data[activePage].content;
    }
    UpdateStatus();
  }

  function AddSearchBar(){
    var search = `<div class="rpm-search"><input type="text" id="rpm-status-search" placeholder="Filter metrics..." aria-label="Search metrics"></div>`;
    $(search).insertBefore('#sortableListGroup');
    $('#rpm-status-search').on('input', function(){
      var q = $(this).val().toLowerCase();
      $('#sortableListGroup .row.list-group-item').each(function(){
        var text = $(this).text().toLowerCase();
        $(this).toggleClass('hide', q && text.indexOf(q) < 0);
      });
    });
  }

  function AddExportButton(){
    var btn = `<button class="rpm-export-btn ms-2" id="rpm-export" title="Export data as JSON"><i class="bi bi-download"></i> Export</button>`;
    if ( $('#pageTitle').hasClass('hide') ) {
      $('#pageTitle').removeClass('hide');
    }
    $('#pageTitle').append(btn);
    $('#rpm-export').on('click', function(){
      var dyn = getData('dynamic');
      var stat = getData('static');
      ExportData('rpimonitor-status', { static: stat, dynamic: dyn, timestamp: new Date().toISOString() });
    });
  }

  function ActivateCollapsible(){
    $('#sortableListGroup').on('click', '.Title', function(e){
      if ($(e.target).closest('.DragHandle').length) return;
      $(this).closest('.row.list-group-item').toggleClass('collapsed');
    });
  }

  function AddRefreshIndicator(){
    var icon = `<i class="bi bi-arrow-clockwise rpm-refresh-icon" id="rpm-refresh-indicator"></i>`;
    if ( !$('#pageTitle').hasClass('hide') ) {
      $('#pageTitle').prepend(icon);
    } else {
      $('.container-fluid.column-fluid').before(icon);
    }
  }

  function ShowRefreshAnimation(){
    var el = document.getElementById('rpm-refresh-indicator');
    if (el) {
      el.classList.add('spinning');
      setTimeout(function(){ el.classList.remove('spinning'); }, 800);
    }
  }

  function AddOption()
  {
    var options = `<p><b>Status</b><br>` +
      `<form class="form-inline">` +
      `<input type="checkbox" id="statusautorefresh"> Auto refresh status page` +
      `</form></p>` +
      `<p><small class="text-muted">Keyboard: <span class="rpm-kbd">S</span> Status <span class="rpm-kbd">G</span> Statistics <span class="rpm-kbd">A</span> Add-ons <span class="rpm-kbd">H</span> Home <span class="rpm-kbd">?</span> About</small></p>`;
    $(options).insertBefore("#optionsInsertionPoint");
  }

  $(function () {
    $.ajaxSetup({ cache: false });

    animate=(localStorage.getItem('animate') === 'true');
    statusautorefresh=(localStorage.getItem('statusautorefresh') === 'true');

    ShowFriends();
    setupqr();
    doqr(document.URL);

    ConstructPage();
    AddSearchBar();
    AddRefreshIndicator();
    AddExportButton();
    ActivateCollapsible();
    AddOption();

    $('#statusautorefresh').attr('checked', statusautorefresh );

    $('#animate').click(function(){
      animate = $('#animate').is(":checked");
      localStorage.setItem('animate', animate);
      SetProgressBarAnimate();
    });

    $('#statusautorefresh').click(function(){
      statusautorefresh = $('#statusautorefresh').is(":checked");
      localStorage.setItem('statusautorefresh', statusautorefresh);
      if ( statusautorefresh ) {
        UpdateStatus();
        refreshTimerId = setInterval( UpdateStatus , 10000 );
        clockId=setInterval(Tick,1000);
      }
      else {
        clearInterval(refreshTimerId);
        clearInterval(clockId);
      }
    });

    if ( statusautorefresh ) {
      refreshTimerId = setInterval( UpdateStatus , 10000 );
      clockId=setInterval(Tick,1000);
    }

    Sortable.create(sortableListGroup,{ handle: '.DragHandle',
                                        animation: 150,
                                        group: "status-row-order",
                                        store: {
                                            get: function (sortable) {
                                                var order = localStorage.getItem(sortable.options.group.name);
                                                return order ? order.split('|') : [];
                                            },
                                            set: function (sortable) {
                                                var order = sortable.toArray();
                                                localStorage.setItem(sortable.options.group.name, order.join('|'));
                                            }
                                        }
                                      }
                   );
  });
})();


