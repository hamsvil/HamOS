 
/* eslint-disable no-case-declarations */
import React from 'react';
import { clsx } from 'clsx';

export function renderNode(node: Element, keyPrefix: string = "0", _parentType: string = ""): React.ReactNode {
  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const tagName = node.tagName;
  const children = Array.from(node.children).map((child, idx) => renderNode(child, `${keyPrefix}-${idx}`, tagName));
  
  // Extract common Android attributes
  const width = node.getAttribute('android:layout_width');
  const height = node.getAttribute('android:layout_height');
  const weight = node.getAttribute('android:layout_weight');
  const text = node.getAttribute('android:text') || '';
  const hint = node.getAttribute('android:hint') || '';
  const background = node.getAttribute('android:background');
  const orientation = node.getAttribute('android:orientation');
  const gravity = node.getAttribute('android:gravity');
  const padding = node.getAttribute('android:padding');
  const margin = node.getAttribute('android:layout_margin');
  const textColor = node.getAttribute('android:textColor');
  const textSize = node.getAttribute('android:textSize');
  const id = node.getAttribute('android:id');
  const src = node.getAttribute('android:src');
  const visibility = node.getAttribute('android:visibility');
  const elevation = node.getAttribute('android:elevation');
  const alpha = node.getAttribute('android:alpha');
  const _onClick = node.getAttribute('android:onClick');

  // Build style object
  let style: React.CSSProperties = {};
  let className = "transition-all duration-200";

  // Visibility
  if (visibility === 'gone') return null;
  if (visibility === 'invisible') style.visibility = 'hidden';

  // Alpha
  if (alpha) style.opacity = parseFloat(alpha);

  // Elevation (Shadow)
  if (elevation) {
    const elevPx = parseInt(elevation.replace('dp', ''));
    if (!isNaN(elevPx)) {
      style.boxShadow = `0 ${elevPx/2}px ${elevPx}px rgba(0,0,0,${Math.min(0.3, elevPx/20)})`;
    }
  }

  // Width/Height
  if (width === 'match_parent' || width === 'fill_parent') style.width = '100%';
  else if (width === 'wrap_content') style.width = 'auto';
  else if (width === '0dp') {
      if (weight) style.width = '0px'; // LinearLayout weight
      else style.width = '100%'; // ConstraintLayout match_constraint fallback
  }
  else if (width) style.width = width.replace('dp', 'px');

  if (height === 'match_parent' || height === 'fill_parent') style.height = '100%';
  else if (height === 'wrap_content') style.height = 'auto';
  else if (height === '0dp') {
      if (weight) style.height = '0px'; // LinearLayout weight
      else style.height = '100%'; // ConstraintLayout match_constraint fallback
  }
  else if (height) style.height = height.replace('dp', 'px');

  // Layout Weight
  if (weight) {
      style.flexGrow = parseFloat(weight);
  }

  // Padding/Margin
  if (padding) style.padding = padding.replace('dp', 'px');
  if (margin) style.margin = margin.replace('dp', 'px');

  // Background
  if (background) {
    if (background.startsWith('#')) {
        // Handle ARGB hex (Android) to RGBA/Hex (CSS)
        // Android: #AARRGGBB -> CSS: #RRGGBBAA (approx) or just use as is if browser supports it
        style.backgroundColor = background;
    }
    else if (background.startsWith('@color/')) {
      const colorName = background.replace('@color/', '');
      const colorMap: Record<string, string> = {
        'black': '#000000',
        'white': '#FFFFFF',
        'primary': '#6200EE',
        'primary_dark': '#3700B3',
        'accent': '#03DAC5',
        'transparent': 'transparent',
        'purple_200': '#BB86FC',
        'purple_500': '#6200EE',
        'purple_700': '#3700B3',
        'teal_200': '#03DAC5',
        'teal_700': '#018786',
      };
      style.backgroundColor = colorMap[colorName] || '#cccccc';
    }
  }

  // Text styling
  if (textColor) {
    if (textColor.startsWith('#')) style.color = textColor;
  }
  if (textSize) style.fontSize = textSize.replace('sp', 'px').replace('dp', 'px');

  // Gravity (very simplified)
  if (gravity) {
    if (gravity.includes('center')) {
      style.display = 'flex';
      style.justifyContent = 'center';
      style.alignItems = 'center';
      style.textAlign = 'center';
    }
    if (gravity.includes('right') || gravity.includes('end')) {
        style.textAlign = 'right';
        style.justifyContent = 'flex-end';
    }
  }

  // Clean text (remove @string/ references for preview)
  const displayText = text.startsWith('@string/') ? text.replace('@string/', '') : text;
  const displayHint = hint.startsWith('@string/') ? hint.replace('@string/', '') : hint;

  // Layout Gravity
  const layoutGravity = node.getAttribute('android:layout_gravity');
  if (layoutGravity) {
    if (layoutGravity.includes('center')) style.alignSelf = 'center';
    if (layoutGravity.includes('right') || layoutGravity.includes('end')) style.alignSelf = 'flex-end';
    if (layoutGravity.includes('left') || layoutGravity.includes('start')) style.alignSelf = 'flex-start';
  }

  switch (tagName) {
    case 'LinearLayout':
      style.display = 'flex';
      style.flexDirection = orientation === 'horizontal' ? 'row' : 'column';
      // Apply gravity to children alignment
      if (gravity) {
        if (orientation === 'horizontal') {
            if (gravity.includes('center_vertical')) style.alignItems = 'center';
            if (gravity.includes('bottom')) style.alignItems = 'flex-end';
            if (gravity.includes('center_horizontal')) style.justifyContent = 'center';
            if (gravity.includes('right') || gravity.includes('end')) style.justifyContent = 'flex-end';
        } else {
            if (gravity.includes('center_horizontal')) style.alignItems = 'center';
            if (gravity.includes('right') || gravity.includes('end')) style.alignItems = 'flex-end';
            if (gravity.includes('center_vertical')) style.justifyContent = 'center';
            if (gravity.includes('bottom')) style.justifyContent = 'flex-end';
        }
        if (gravity.includes('center')) {
            style.justifyContent = 'center';
            style.alignItems = 'center';
        }
      }
      return <div key={keyPrefix} style={style} className={className} id={id || undefined}>{children}</div>;
      
    case 'RelativeLayout':
    case 'FrameLayout':
    case 'androidx.constraintlayout.widget.ConstraintLayout':
      style.position = 'relative';
      if (tagName.includes('ConstraintLayout')) {
          style.display = 'flex';
          style.flexWrap = 'wrap';
          style.alignContent = 'flex-start';
      }
      return <div key={keyPrefix} style={style} className={className} id={id || undefined}>{children}</div>;
      
    case 'TextView':
      return <span key={keyPrefix} style={style} className={`block ${className}`} id={id || undefined}>{displayText}</span>;
      
    case 'Button':
    case 'com.google.android.material.button.MaterialButton':
      style.backgroundColor = style.backgroundColor || '#6200EE';
      style.color = style.color || '#FFFFFF';
      style.padding = style.padding || '8px 16px';
      style.borderRadius = '4px';
      style.textAlign = 'center';
      style.fontWeight = 'bold';
      style.textTransform = 'uppercase';
      style.border = 'none';
      style.display = 'flex';
      style.alignItems = 'center';
      style.justifyContent = 'center';
      style.cursor = 'pointer';
      style.boxShadow = style.boxShadow || '0 2px 4px rgba(0,0,0,0.2)';
      return <button key={keyPrefix} style={style} className={`my-1 active:scale-95 active:opacity-80 ${className}`} id={id || undefined}>{displayText}</button>;
      
    case 'ImageButton':
      style.backgroundColor = style.backgroundColor || '#e0e0e0';
      style.padding = style.padding || '8px';
      style.borderRadius = '50%';
      style.border = 'none';
      style.display = 'flex';
      style.alignItems = 'center';
      style.justifyContent = 'center';
      style.cursor = 'pointer';
      return (
        <button key={keyPrefix} style={style} className={`active:scale-95 active:opacity-80 ${className}`} id={id || undefined}>
           <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
        </button>
      );

    case 'EditText':
    case 'com.google.android.material.textfield.TextInputEditText':
      style.borderBottom = '1px solid #6200EE';
      style.padding = style.padding || '8px 4px';
      style.backgroundColor = 'transparent';
      style.outline = 'none';
      return <input key={keyPrefix} type="text" placeholder={displayHint} defaultValue={displayText} style={style} className={`w-full my-1 ${className}`} id={id || undefined} />;
      
    case 'HorizontalScrollView':
      style.overflowX = 'auto';
      style.overflowY = 'hidden';
      style.display = 'block';
      style.whiteSpace = 'nowrap';
      return <div key={keyPrefix} style={style} className={className} id={id || undefined}>{children}</div>;

    case 'RadioGroup':
      style.display = 'flex';
      style.flexDirection = orientation === 'horizontal' ? 'row' : 'column';
      return <div key={keyPrefix} style={style} className={className} id={id || undefined}>{children}</div>;

    case 'RadioButton':
      style.display = 'flex';
      style.alignItems = 'center';
      style.gap = '8px';
      return (
        <div key={keyPrefix} style={style} className={className} id={id || undefined}>
            <input type="radio" name="radio-group" defaultChecked={node.getAttribute('android:checked') === 'true'} />
            <span>{displayText}</span>
        </div>
      );

    case 'CheckBox':
      style.display = 'flex';
      style.alignItems = 'center';
      style.gap = '8px';
      return (
        <div key={keyPrefix} style={style} className={className} id={id || undefined}>
            <input type="checkbox" defaultChecked={node.getAttribute('android:checked') === 'true'} />
            <span>{displayText}</span>
        </div>
      );

    case 'Switch':
    case 'com.google.android.material.switchmaterial.SwitchMaterial':
      style.display = 'flex';
      style.alignItems = 'center';
      style.gap = '8px';
      return (
        <div key={keyPrefix} style={style} className={className} id={id || undefined}>
            <div className="relative inline-block w-10 h-6 transition duration-200 ease-in-out bg-gray-400 rounded-full cursor-pointer">
                <span className="absolute left-1 bottom-1 bg-white w-4 h-4 rounded-full"></span>
            </div>
            <span>{displayText}</span>
        </div>
      );

    case 'ProgressBar':
      style.width = style.width === 'auto' ? '40px' : style.width;
      style.height = style.height === 'auto' ? '40px' : style.height;
      return (
        <div key={keyPrefix} style={style} className={`flex items-center justify-center ${className}`} id={id || undefined}>
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      );

    case 'Spinner':
      style.borderBottom = '1px solid #ccc';
      style.padding = '8px';
      return (
        <div key={keyPrefix} style={style} className={`flex items-center justify-between ${className}`} id={id || undefined}>
            <span>{displayText || 'Select Item'}</span>
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
        </div>
      );

    case 'ImageView':
      style.backgroundColor = style.backgroundColor || 'transparent';
      style.display = 'flex';
      style.alignItems = 'center';
      style.justifyContent = 'center';
      style.minWidth = style.width === 'auto' ? '50px' : style.width;
      style.minHeight = style.height === 'auto' ? '50px' : style.height;
      
      const isDrawable = src && (src.startsWith('@drawable/') || src.startsWith('@mipmap/'));
      const drawableName = isDrawable ? src.split('/').pop() : '';

      return (
        <div key={keyPrefix} style={style} className={className} id={id || undefined}>
          {src ? (
             // Try to simulate basic icons if src matches common names
             src.includes('ic_launcher') ? <div className="w-10 h-10 bg-green-500 rounded-lg shadow-sm"></div> :
             isDrawable ? (
                 <div className="flex flex-col items-center justify-center text-gray-400 bg-gray-700/30 w-full h-full rounded border border-dashed border-gray-600 p-1">
                     <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                     <span className="text-[8px] mt-1 max-w-full truncate px-1 opacity-70">{drawableName}</span>
                 </div>
             ) : (
                 <img src={src} alt="Preview" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" onError={(e) => {
                     e.currentTarget.style.display = 'none';
                     e.currentTarget.parentElement?.classList.add('bg-red-500/10');
                 }}/>
             )
          ) : (
             <div className="w-full h-full bg-gray-300/20 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
             </div>
          )}
        </div>
      );
      
    case 'androidx.recyclerview.widget.RecyclerView':
      style.overflowY = 'auto';
      style.display = 'flex';
      style.flexDirection = 'column';
      style.gap = '8px';
      return (
        <div key={keyPrefix} style={style} className={`bg-gray-800/20 p-2 ${className}`} id={id || undefined}>
           {[1, 2, 3].map(i => (
             <div key={i} className="bg-gray-700/50 p-3 rounded border border-gray-600/30 flex items-center gap-2">
               <div className="w-8 h-8 bg-gray-600 rounded-full"></div>
               <div className="flex-1 h-2 bg-gray-600 rounded w-3/4"></div>
             </div>
           ))}
           <div className="text-xs text-center text-gray-500 mt-2">RecyclerView (Preview)</div>
        </div>
      );

    case 'androidx.cardview.widget.CardView':
    case 'com.google.android.material.card.MaterialCardView':
      const cardRadius = node.getAttribute('app:cardCornerRadius') || node.getAttribute('android:radius');
      style.borderRadius = cardRadius ? cardRadius.replace('dp', 'px') : '8px';
      style.boxShadow = style.boxShadow || '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
      style.backgroundColor = style.backgroundColor || '#2d2d2d';
      style.overflow = 'hidden';
      style.margin = style.margin || '8px';
      return <div key={keyPrefix} style={style} className={className} id={id || undefined}>{children}</div>;

    case 'com.google.android.material.appbar.AppBarLayout':
      style.display = 'flex';
      style.flexDirection = 'column';
      style.backgroundColor = style.backgroundColor || '#6200EE';
      style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
      return <div key={keyPrefix} style={style} className={className} id={id || undefined}>{children}</div>;

    case 'androidx.appcompat.widget.Toolbar':
    case 'com.google.android.material.appbar.MaterialToolbar':
      style.height = style.height === 'auto' ? '56px' : style.height;
      style.backgroundColor = style.backgroundColor || 'transparent';
      style.display = 'flex';
      style.alignItems = 'center';
      style.padding = '0 16px';
      style.color = '#fff';
      style.fontWeight = 'bold';
      style.fontSize = '18px';
      return (
        <div key={keyPrefix} style={style} className={className} id={id || undefined}>
           <div className="flex items-center gap-4 w-full">
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" x2="21" y1="12" y2="12"/><line x1="3" x2="21" y1="6" y2="6"/><line x1="3" x2="21" y1="18" y2="18"/></svg>
             <div className="flex-1 truncate">{children.length > 0 ? children : <span>{node.getAttribute('app:title') || 'App Toolbar'}</span>}</div>
             <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
           </div>
        </div>
      );

    case 'com.google.android.material.tabs.TabLayout':
      style.height = '48px';
      style.backgroundColor = style.backgroundColor || '#6200EE';
      style.display = 'flex';
      style.borderBottom = '2px solid rgba(255,255,255,0.1)';
      return (
        <div key={keyPrefix} style={style} className={className} id={id || undefined}>
           {['TAB 1', 'TAB 2', 'TAB 3'].map((tab, i) => (
             <div key={i} className={clsx("flex-1 flex items-center justify-center text-[10px] font-bold tracking-wider", i === 0 ? "text-white border-b-2 border-white" : "text-white/60")}>
               {tab}
             </div>
           ))}
        </div>
      );

    case 'com.google.android.material.bottomnavigation.BottomNavigationView':
      style.height = '56px';
      style.backgroundColor = style.backgroundColor || '#1e1e1e';
      style.display = 'flex';
      style.borderTop = '1px solid rgba(255,255,255,0.05)';
      style.position = 'absolute';
      style.bottom = '0';
      style.left = '0';
      style.right = '0';
      return (
        <div key={keyPrefix} style={style} className={className} id={id || undefined}>
           {[1, 2, 3, 4].map(i => (
             <div key={i} className="flex-1 flex flex-col items-center justify-center gap-1">
               <div className={clsx("w-5 h-5 rounded-full", i === 1 ? "bg-blue-400/20 text-blue-400" : "text-white/40")}>
                 <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-full h-full"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
               </div>
               <span className={clsx("text-[8px]", i === 1 ? "text-blue-400" : "text-white/40")}>Item {i}</span>
             </div>
           ))}
        </div>
      );

    case 'com.google.android.material.floatingactionbutton.FloatingActionButton':
      style.width = '56px';
      style.height = '56px';
      style.borderRadius = '50%';
      style.backgroundColor = node.getAttribute('app:backgroundTint') || '#03DAC5';
      style.position = 'absolute';
      style.bottom = '16px';
      style.right = '16px';
      style.display = 'flex';
      style.alignItems = 'center';
      style.justifyContent = 'center';
      style.boxShadow = '0 4px 8px rgba(0,0,0,0.3)';
      style.color = node.getAttribute('app:tint') || '#000';
      return (
        <div key={keyPrefix} style={style} className={className} id={id || undefined}>
           <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
        </div>
      );

    case 'ScrollView':
      style.overflowY = 'auto';
      style.display = 'block';
      return <div key={keyPrefix} style={style} className={className} id={id || undefined}>{children}</div>;

    default:
      // Fallback for unknown views
      return (
        <div key={keyPrefix} style={style} className={`border border-dashed border-gray-400 p-2 ${className}`} id={id || undefined}>
          <div className="text-xs text-gray-400 mb-1">{tagName}</div>
          {children}
        </div>
      );
  }
}
