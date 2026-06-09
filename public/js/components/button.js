var ICON_COLORS = {
  edit:   { bg: 'bg-blue-100',   hover: 'hover:bg-blue-200',   text: 'text-blue-600' },
  delete: { bg: 'bg-red-100',    hover: 'hover:bg-red-200',    text: 'text-red-500' },
  status: { bg: 'bg-amber-100',  hover: 'hover:bg-amber-200',  text: 'text-amber-600' }
};

var ICON_SVG = {
  edit: '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>',
  delete: '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>'
};

function iconButtonHtml(type, tooltip, attrs, tooltipPos) {
  var c = ICON_COLORS[type] || ICON_COLORS.edit;
  var svg = ICON_SVG[type] || ICON_SVG.edit;
  var extraClass = (attrs && attrs.class) ? ' ' + attrs.class : '';
  var pos = tooltipPos === 'right'
    ? 'right-0 origin-bottom-right'
    : 'left-1/2 -translate-x-1/2 origin-bottom';

  var attrStr = '';
  if (attrs) {
    for (var k in attrs) {
      if (k === 'class') continue;
      attrStr += ' ' + k + '="' + escapeHtml(String(attrs[k])) + '"';
    }
  }

  return '<div class="relative group">' +
    '<button class="' + c.bg + ' ' + c.hover + ' ' + c.text + ' p-2 rounded-xl transition' + extraClass + '"' + attrStr + '>' +
      svg +
    '</button>' +
    '<span class="absolute bottom-full mb-2 scale-0 group-hover:scale-100 ' + pos + ' transition-transform duration-200 bg-slate-900 text-white text-xs px-3 py-2 rounded-lg whitespace-nowrap shadow-lg border border-slate-600 z-50">' +
      escapeHtml(tooltip) +
    '</span>' +
  '</div>';
}
