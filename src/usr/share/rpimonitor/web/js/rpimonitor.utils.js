// This file is part of RPi-Monitor project
//
// Copyright 2013 - Xavier Berger - http://rpi-experiences.blogspot.fr/
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
var strips;
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

function ShowInfo(id,title,text){
  if ( text ) {
    postProcessInfo.push(["#"+id, title, text]);
    return " <a href='#' id='"+id+"'><svg xmlns='http://www.w3.org/2000/svg' width='14' height='14' fill='currentColor' class='bi bi-search' viewBox='0 0 16 16'><path d='M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z'/></svg>"
  }
  else {
    return "";
  }
}

function Pad(n){
  return n<10 ? '0'+n : n
}

function Plural(n){
  return n>1 ? 's ' : ' '
}

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
  if ( years != 0 ) { uptimetext += uptimetext + "<b>" + years + "</b> year" + Plural(years) }
  if ( ( years != 0 ) || ( days != 0) ) { uptimetext += "<b>" + days +"</b> day" + Plural(days)}
  if ( ( days != 0 ) || ( hours != 0) ) { uptimetext += "<b>" + Pad(hours) +"</b> hour" + Plural(hours)}
  uptimetext += "<b>" + Pad(minutes) +"</b> minute" + Plural(minutes);
  uptimetext += "<b>" + Pad(seconds) +"</b> second" + Plural(seconds)+"<p>"
  return uptimetext;
}

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

function Percent(value,total){
  return (100*value/total).toFixed(2)+"%";
}

function ProgressBar(value, max, warning, danger){
  var percent = ((100 * value ) / max).toFixed(2)
  var warning = warning || 0
  var danger = danger || 0
  var color = ''
  if (danger > warning) {
    if (percent > warning) {
      color = 'bg-warning text-dark'
    }
    if (percent > danger) {
      color = 'bg-danger'
    }
  }
  else {
    if (percent < warning) {
      color = 'bg-warning text-dark'
    }
    if (percent < danger) {
      color = 'bg-danger'
    }
  }
  return "<div class='progress'><div class='progress-bar "+color+"' role='progressbar' aria-valuemin='0' aria-valuemax='100' aria-valuenow='"+percent+"' style='width: "+percent+"%;'>"+percent+"%</div></div>"
}

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

  div="<div class='justgage' id='gauge"+(justgageId)+"' style='width:"+width+"px; height:"+height+"px;'></div>"
  postProcessCommand.push('var g = new JustGage({'+
    'id: "gauge'+(justgageId)+'",'+
    'value: '+value+','+
    'min: '+min+','+
    'max: '+max+','+
    'label: "'+label+'",'+
    'title: "'+title+'",'+
    'startAnimationTime: 1,'+
    'startAnimationType: "linear",'+
    'levelColors: ["'+ levelColors[0] +'","'+levelColors[1] +'","'+levelColors[2] +'"]'+
    '})')
  return div
}

function Label(data,formula, text, level){
  var result="";
  if ( level.indexOf('label-') < 0 ) { level = 'label-'+level };
  var dataStr = isNaN(data) ? "\""+data+"\"" : data;
  try {
    var fn = new Function('return (' + dataStr + formula + ')');
    if ( fn() ) {
      result = "<span class='label "+level+"'>"+text+"</span>";
    }
  } catch(e) {}
  return result;
}

function Badge(data,formula, text, level){
  var result="";
  if ( level.indexOf('alert-') < 0 ) { level = 'alert-'+level };
  var dataStr = isNaN(data) ? "\""+data+"\"" : data;
  try {
    var fn = new Function('return (' + dataStr + formula + ')');
    if ( fn() ) {
      result = "<span class='badge "+level+"'>"+text+"</span>";
    }
  } catch(e) {}
  return result;
}

var clocksec=0;
function Clock(localtime){
  clocksec=localtime[5];
  return Pad(localtime[3])+":"+Pad(localtime[4])+"</b>:<b><span id='seconds'>" + Pad(clocksec) + "</span></b>";
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

function LinkToGraph(page, graph, text, target="_top"){
    return "<a target="+target+" href=statistics.html?activePage="+page+"&graph="+graph+">"+text+"</a>"
}

