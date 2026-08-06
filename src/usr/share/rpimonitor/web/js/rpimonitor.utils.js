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
 * Utility functions for RPi-Monitor web interface.
 * @module rpimonitor.utils
 */
(function() {
  'use strict';

  var postProcessInfo=[];
  var justgageId=0;
  var postProcessCommand=[];

  var safeEvalContext = {
    window: undefined,
    document: undefined,
    localStorage: undefined,
    eval: undefined,
    Function: undefined
  };

  /**
   * Safely evaluate an expression with a restricted context.
   * @param {string} expr - The expression to evaluate.
   * @param {Object} [context] - Additional context variables.
   * @returns {*} The result, or the original expr on error.
   */
  function safeEval(expr, context) {
    var ctx = {};
    for (var k in safeEvalContext) { ctx[k] = safeEvalContext[k]; }
    if (context) { for (var k in context) { ctx[k] = context[k]; } }
    try {
      var keys = Object.keys(ctx);
      var values = keys.map(function(k) { return ctx[k]; });
      var fn = new Function(keys.join(','), 'return (' + expr + ')');
      return fn.apply(null, values);
    } catch(e) {
      return expr;
    }
  }

  /**
   * Safely evaluate a statement with a restricted context.
   * @param {string} stmt - The statement to evaluate.
   * @param {Object} [context] - Additional context variables.
   * @returns {*} The result, or the original stmt on error.
   */
  function safeEvalStmt(stmt, context) {
    var ctx = {};
    for (var k in safeEvalContext) { ctx[k] = safeEvalContext[k]; }
    if (context) { for (var k in context) { ctx[k] = context[k]; } }
    try {
      var keys = Object.keys(ctx);
      var values = keys.map(function(k) { return ctx[k]; });
      var fn = new Function(keys.join(','), stmt);
      fn.apply(null, values);
    } catch(e) {
      console.error('safeEvalStmt error:', e);
    }
  }

/**
 * Create an info icon with popover data.
 * @param {string} id - DOM element ID for the popover trigger.
 * @param {string} title - Popover title.
 * @param {string} text - Popover content.
 * @returns {string} HTML string with info icon, or empty string.
 */
  function ShowInfo(id,title,text){
    if ( text ) {
      postProcessInfo.push([`#${id}`, title, text]);
      return ` <a href='#' id='${id}'><i class='bi bi-info-circle' style='color:var(--rpm-accent)'></i></a>`;
    }
    else {
      return "";
    }
  }

/**
 * Pad a number with leading zero if < 10.
 * @param {number} n - The number to pad.
 * @returns {string} Zero-padded string.
 */
  function Pad(n){
    return n<10 ? `0${n}` : n
  }

  /**
   * Return plural 's ' or singular ' ' based on count.
   * @param {number} n - The count to check.
   * @returns {string} 's ' if n > 1, else ' '.
   */
  function Plural(n){
    return n>1 ? 's ' : ' '
  }

/**
 * Format uptime seconds into a human-readable string.
 * @param {number} value - Uptime in seconds.
 * @returns {string} HTML-formatted uptime string.
 */
  function Uptime(value){
    var uptimetext='';
    var years = Math.floor(value / 31556926);
    var rest = value % 31556926;
    var days = Math.floor( rest / 86400);
    rest = value % 86400;
    var hours = Math.floor(rest / 3600);
    rest = value % 3600;
    var minutes = Math.floor(rest / 60);
    var seconds = Math.floor(rest % 60);
    if ( years != 0 ) { uptimetext += `<b>${years}</b> year${Plural(years)}` }
    if ( ( years != 0 ) || ( days != 0) ) { uptimetext += `<b>${days}</b> day${Plural(days)}` }
    if ( ( days != 0 ) || ( hours != 0) ) { uptimetext += `<b>${Pad(hours)}</b> hour${Plural(hours)}` }
    uptimetext += `<b>${Pad(minutes)}</b> minute${Plural(minutes)}`;
    uptimetext += `<b>${Pad(seconds)}</b> second${Plural(seconds)}<p>`;
    return uptimetext;
  }

/**
 * Format a byte value with SI prefixes (k, M, G, T, P, E).
 * @param {number} value - The value in bytes.
 * @param {string} [initPre] - Initial prefix to convert from.
 * @returns {string} Formatted string like "1.50MB".
 */
  function KMG(value, initPre){
    var unit = 1024;
    var prefix = "kMGTPE";
    if (initPre){
      value *= Math.pow(unit,prefix.indexOf(initPre)+1);
    }
    try {
      if (Math.abs(value) < unit) { return value + "B" };
      var exp = Math.floor(Math.log(Math.abs(value)) / Math.log(unit));
      var pre = prefix.charAt(exp-1);
      return (value / Math.pow(unit, exp)).toFixed(2) + pre + "B";
    }
    catch (e) {
      return "Error"
    }
  }

/**
 * Calculate percentage string.
 * @param {number} value - The part value.
 * @param {number} total - The total value.
 * @returns {string} Percentage string like "33.33%".
 */
  function Percent(value,total){
    return (100*value/total).toFixed(2)+"%";
  }

/**
 * Create a Bootstrap progress bar HTML.
 * @param {number} value - Current value.
 * @param {number} max - Maximum value.
 * @param {number} [warning] - Warning threshold percentage.
 * @param {number} [danger] - Danger threshold percentage.
 * @returns {string} HTML string for a Bootstrap progress bar.
 */
  function ProgressBar(value, max, warning, danger){
    var percent = ((100 * value ) / max).toFixed(2)
    var warning = warning || 0
    var danger = danger || 0
    var color = ''
    if (danger > warning) {
      if (percent > warning) { color = 'bg-warning text-dark' }
      if (percent > danger) { color = 'bg-danger' }
    }
    else {
      if (percent < warning) { color = 'bg-warning text-dark' }
      if (percent < danger) { color = 'bg-danger' }
    }
    return `<div class='progress'><div class='progress-bar ${color}' role='progressbar' aria-valuemin='0' aria-valuemax='100' aria-valuenow='${percent}' style='width: ${percent}%;'>${percent}%</div></div>`
  }

/**
 * Create a JustGage gauge HTML element.
 * @param {string} title - Gauge title.
 * @param {string} label - Gauge label.
 * @param {number} min - Minimum value.
 * @param {number} value - Current value.
 * @param {number} max - Maximum value.
 * @param {number} [width=100] - Gauge width in pixels.
 * @param {number} [height=80] - Gauge height in pixels.
 * @param {Array} [levelColors] - Array of 3 color strings.
 * @param {number} [warning] - Warning threshold.
 * @param {number} [critical] - Critical threshold.
 * @returns {string} HTML div string for the gauge.
 */
  function JustGageBar(title, label, min, value, max, width, height, levelColors, warning, critical){
    width  = width  || 100
    height = height || 80
    min = min       || 0
    max = max       || 1
    value = value   || 0
    levelColors = levelColors || percentColors
    if (( warning != undefined ) && (critical != undefined)){
      if ( value > critical ) {
        levelColors = [levelColors[2], levelColors[2], levelColors[2]];
      } else
      if ( value > warning ) {
        levelColors = [levelColors[1], levelColors[1], levelColors[1]];
      } else {
        levelColors = [levelColors[0], levelColors[0], levelColors[0]];
      }
    }

    justgageId++

    var div = `<div class='justgage' id='gauge${justgageId}' style='width:${width}px; height:${height}px;'></div>`
    postProcessCommand.push(`var g = new JustGage({id: "gauge${justgageId}",value: ${value},min: ${min},max: ${max},label: "${label}",title: "${title}",startAnimationTime: 1,startAnimationType: "linear",levelColors: ["${levelColors[0]}","${levelColors[1]}","${levelColors[2]}"]})`)
    return div
  }

  function Label(data,formula, text, level){
    var result="";
    if ( level.indexOf('label-') < 0 ) { level = `label-${level}` };
    var dataStr = isNaN(data) ? `"${data}"` : data;
    try {
      var fn = new Function('return (' + dataStr + formula + ')');
      if ( fn() ) {
        result = `<span class='label ${level}'>${text}</span>`;
      }
    } catch(e) {}
    return result;
  }

  function Badge(data,formula, text, level){
    var result="";
    if ( level.indexOf('alert-') < 0 ) { level = `alert-${level}` };
    var dataStr = isNaN(data) ? `"${data}"` : data;
    try {
      var fn = new Function('return (' + dataStr + formula + ')');
      if ( fn() ) {
        result = `<span class='badge ${level}'>${text}</span>`;
      }
    } catch(e) {}
    return result;
  }

  var clocksec=0;
  function Clock(localtime){
    clocksec=localtime[5];
    return `${Pad(localtime[3])}:${Pad(localtime[4])}</b>:<b><span id='seconds'>${Pad(clocksec)}</span></b>`;
  }

  function Tick(){
    clocksec++;
    if (clocksec == 60) { clocksec=0 };
    $('#seconds').html(Pad(clocksec));
  }

  function InsertHTML( url ){
     var result = "";
     $.ajax({
        url: url,
        async:false,
        success: function(data) {
          result = data
        }
      })
    return result
  }

  function LinkToGraph(page, graph, text, target){
    target = target || "_top";
    return `<a target='${target}' href='statistics.html?activePage=${page}&graph=${graph}'>${text}</a>`
  }

  function CompactUptime(value){
    var days = Math.floor(value / 86400);
    var hours = Math.floor((value % 86400) / 3600);
    var mins = Math.floor((value % 3600) / 60);
    var secs = Math.floor(value % 60);
    var parts = [];
    if (days > 0) parts.push(days + 'd');
    if (hours > 0 || days > 0) parts.push(hours + 'h');
    if (mins > 0 || hours > 0 || days > 0) parts.push(mins + 'm');
    parts.push(secs + 's');
    return `<span class="rpm-uptime-compact">${parts.join(' ')}</span>`;
  }

  function TempColor(temp, warn, crit){
    warn = warn || 60;
    crit = crit || 75;
    if (temp >= crit) return `<span class="rpm-temp-hot">${temp}°C</span>`;
    if (temp >= warn) return `<span class="rpm-temp-warm">${temp}°C</span>`;
    return `<span class="rpm-temp-cool">${temp}°C</span>`;
  }

  function Sparkline(values, width, height, color){
    width = width || 60;
    height = height || 20;
    color = color || '#6366f1';
    if (!values || values.length < 2) return '';
    var min = Math.min.apply(null, values);
    var max = Math.max.apply(null, values);
    var range = max - min || 1;
    var step = width / (values.length - 1);
    var points = values.map(function(v, i){
      var x = (i * step).toFixed(1);
      var y = (height - ((v - min) / range) * height).toFixed(1);
      return x + ',' + y;
    }).join(' ');
    var id = 'spark' + Math.random().toString(36).substr(2,9);
    return `<span class="rpm-sparkline"><svg width="${width}" height="${height}"><polyline points="${points}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>`;
  }

  function RingChart(percent, label, size, color){
    size = size || 60;
    color = color || '#6366f1';
    var stroke = 6;
    var r = (size - stroke) / 2;
    var circ = 2 * Math.PI * r;
    var offset = circ - (percent / 100) * circ;
    var id = 'ring' + Math.random().toString(36).substr(2,9);
    return `<span class="rpm-ring" style="width:${size}px;height:${size}px">` +
      `<svg width="${size}" height="${size}">` +
      `<circle class="rpm-ring-bg" cx="${size/2}" cy="${size/2}" r="${r}" stroke-width="${stroke}"/>` +
      `<circle class="rpm-ring-fg" cx="${size/2}" cy="${size/2}" r="${r}" stroke-width="${stroke}" stroke="${color}" stroke-dasharray="${circ}" stroke-dashoffset="${offset}"/>` +
      `</svg>` +
      `<span class="rpm-ring-label">${label || percent + '%'}</span>` +
      `</span>`;
  }

  function ExportData(name, data){
    var json = JSON.stringify(data, null, 2);
    var blob = new Blob([json], {type: 'application/json'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name + '-' + new Date().toISOString().slice(0,10) + '.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Expose to global scope for legacy compatibility
  window.safeEval = safeEval;
  window.safeEvalStmt = safeEvalStmt;
  window.ShowInfo = ShowInfo;
  window.Pad = Pad;
  window.Plural = Plural;
  window.Uptime = Uptime;
  window.KMG = KMG;
  window.Percent = Percent;
  window.ProgressBar = ProgressBar;
  window.JustGageBar = JustGageBar;
  window.Label = Label;
  window.Badge = Badge;
  window.Clock = Clock;
  window.Tick = Tick;
  window.InsertHTML = InsertHTML;
  window.LinkToGraph = LinkToGraph;
  window.CompactUptime = CompactUptime;
  window.TempColor = TempColor;
  window.Sparkline = Sparkline;
  window.RingChart = RingChart;
  window.ExportData = ExportData;
  window.postProcessInfo = postProcessInfo;
  window.postProcessCommand = postProcessCommand;
  window.justgageId = justgageId;
})();

