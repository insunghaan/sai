/* Private per-person mock sensor windows. No emotion inference. */
(function(root){const create=(baseline)=>({baseline,current:null,window:null,moments:[],sequence:0});
function sample(s,bpm,at){if(!Number.isFinite(bpm)||bpm<=0)return; // Close the previous [start, end) window before processing this sample.
if(s.window&&at>=s.window.start+20000){const w=s.window;s.moments.push({id:++s.sequence,start:w.start,end:w.start+20000,peak:w.peak,peakAt:w.peakAt,note:'',draft:'',dismissed:false});s.window=null;}
s.current=bpm;if(s.window){if(bpm>s.window.peak){s.window.peak=bpm;s.window.peakAt=at}}else if(bpm>s.baseline){s.window={start:at,peak:bpm,peakAt:at,previous:s.baseline}}
s.baseline=Math.max(s.baseline,bpm);}
function stop(s){s.window=null;}const api={create,sample,stop};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SAIDateHeart=api;})(typeof window==='undefined'?globalThis:window);
