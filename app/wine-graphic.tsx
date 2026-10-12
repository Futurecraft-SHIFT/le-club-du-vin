// Original vector artwork: bold, irregular silhouettes inspired by natural-wine labels.
export default function WineGraphic({style}:{style:string}){
 const type=style==='Sparkling'?'Bubbles':style;
 return <svg className={'wine-graphic graphic-'+type} viewBox="0 0 640 260" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
 <path className="graphic-ground" d="M-20 119C87 157 119 94 202 114S365 167 448 121 566 103 660 135V280H-20Z"/>
 {type==='Red'?<>
 <g className="graphic-cluster" fill="#ef2447"><path d="M-4 108C-16 57 34 39 58 70 57 23 112 21 131 59 171 40 195 78 179 107 217 130 195 171 163 169 175 211 128 229 105 203 89 241 42 228 40 194 1 205-24 166 0 144-29 134-24 116-4 108Z"/><path d="M478 171C447 138 470 99 506 107 484 74 515 38 548 60 558 20 607 23 619 58 659 47 680 88 650 114 678 142 651 178 620 171 621 216 566 225 550 193 522 220 478 206 478 171Z"/></g>
 <g fill="none" stroke="#462482" strokeWidth="5" strokeLinecap="round"><path d="M104 52Q98 18 128 1M97 60Q61 43 60 14Q97 12 108 44M546 65Q552 29 586 10"/><path d="M20 116Q46 90 64 117M80 147Q100 125 123 148M120 89Q144 73 160 97M505 127Q524 112 541 130M557 167Q575 146 594 166"/></g>
 <path fill="#f4ec25" d="m197 181 24-21-4 33 31 9-31 10 3 32-23-24-25 19 8-30-31-11 31-7-3-31Z"/>
 </>:type==='White'?<>
 <path fill="#eee928" d="M-29 188C-4 93 115 40 212 99 188 205 80 259-29 188Z"/><path fill="#fbf7de" d="M-3 179C36 105 111 81 185 111 152 181 81 220-3 179Z"/><g fill="none" stroke="#c4ca3a" strokeWidth="7"><path d="m87 167-24-54m24 54 34-66m-34 66 77-44m-77 44 41 21m-41-21-47 28m47-28-67-15"/></g>
 <path fill="#f3eb25" d="M467 42C575 48 647 128 654 229 544 252 448 162 467 42Z"/><path fill="#fffbe3" d="M487 67C563 80 612 139 629 208 556 205 492 146 487 67Z"/><g fill="none" stroke="#c4ca3a" strokeWidth="6"><path d="m539 139-35-57m35 57 23-30m-23 30 55 16m-55-16 50 48m-50-48-25 35"/></g>
 <path fill="#3e6740" d="M122 68Q139 10 198 19Q199 58 122 68M435 93Q389 38 413 10Q457 43 435 93"/>
 </>:type==='Orange'?<>
 <path fill="#f24b26" d="M-36 143C-27 55 61 16 135 62S193 191 128 225-32 229-36 143Z"/><path fill="#ffb72e" d="M-1 140C0 86 54 56 101 83S143 164 103 190 4 199-1 140Z"/><g fill="none" stroke="#fff0a2" strokeWidth="7" strokeLinecap="round"><path d="m68 137-3-51m3 51 42-27m-42 27 51 20m-51-20 8 48m-8-48-40 31m40-31-46-24"/></g>
 <path d="M513 52C608 14 659 93 600 123S486 139 499 182 588 252 652 207" fill="none" stroke="#ef4c26" strokeWidth="48" strokeLinecap="round"/><path d="M513 48C608 10 659 89 600 119S486 135 499 178 588 248 652 203" fill="none" stroke="#ffb72e" strokeWidth="20" strokeLinecap="round"/>
 <path fill="#4b2c88" d="m187 63 17-24 4 30 29 8-28 9-2 28-19-21-25 14 9-27-18-21Z"/>
 </>:type==='Rosé'?<>
 <path d="M-42 208C17 210 33 51 94 70S97 226 161 202 195 120 217 127" fill="none" stroke="#ee3157" strokeWidth="47" strokeLinecap="round"/><path d="M437 133C486 182 477 244 531 204S536 67 600 79 640 143 674 123" fill="none" stroke="#f04a83" strokeWidth="48" strokeLinecap="round"/>
 <g fill="#49308a"><path d="m28 61 13-27 8 31 30 4-26 16 5 30-22-22-28 14 13-28-21-19Z"/><path d="m575 199 15-24 8 28 29 6-26 12 1 28-19-20-28 12 11-28-23-16Z"/></g><g fill="none" stroke="#faf025" strokeWidth="8" strokeLinecap="round"><path d="m117 132 35-18m-29 43 32-19M488 79l21-26m0 38 25-21"/></g>
 </>:<>
 <g fill="#f4eb2c" stroke="#59318c" strokeWidth="5"><path d="M7 164C-4 104 86 99 98 151S22 214 7 164Z"/><path d="M113 224C84 185 140 151 169 178S155 263 113 224Z"/><path d="M507 169C477 123 550 86 582 128S543 216 507 169Z"/><path d="M586 223C576 185 631 174 646 204S603 263 586 223Z"/></g><g fill="#fff9d9"><ellipse cx="59" cy="59" rx="20" ry="24"/><ellipse cx="161" cy="102" rx="15" ry="18"/><ellipse cx="576" cy="43" rx="20" ry="26"/><ellipse cx="467" cy="76" rx="12" ry="14"/></g><g stroke="#59318c" strokeWidth="5" strokeLinecap="round"><path d="m216 94 10-25m-37 25-11-21m31 43 30-4M454 221l-5-28m-11 37-22-10"/></g>
 </>}
 </svg>
}
