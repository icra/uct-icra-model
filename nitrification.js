/**
  * Nitrification implementation from G. Ekama hand notes
*/

//import "State_Variables" class
if(typeof(require)!="undefined"){var State_Variables=require("./state-variables.js");}

State_Variables.prototype.nitrification=function(Q, T, Rs){
  /* inputs */
  Q  = Q  || 24875; //m3/d | Flowrate
  T  = T  || 16;    //ºC   | Temperature
  Rs = Rs || 15;    //days | Solids retention time

  //dependencies from activated_sludge TODO convert to inputs at the end of implementation
  let Nti   = 50.04; //mg/L  | total TKN influent
  let Nouse = 1.103; //mg/L  | total N_USO effluent
  let MX_T  = 38130; //kg    | total sludge produced
  let Ns    = 8.046; //mg/L  | N required from sludge production
  let SF    = 1.25;  //--    | Safety factor. Design choice. Moves the sludge age.
  let fxt   = 0.39;  //ratio | unaerated sludge mass fraction

  //nitrification starts at page 17

  //3 - nitrification kinetics
  const µAm = 0.45;                     //1/d | growth rate at 20ºC
  let µAmT  = µAm*Math.pow(1.123,T-20); //1/d | growth rate corrected by temperature
  const Kn  = 1.0;                      //mg/L as N at 20ºC
  let KnT   = Kn*Math.pow(1.123,T-20);  //mg/L as N corrected by temperature
  const bA  = 0.04;                     //1/d at 20ºC
  const bAT = bA*Math.pow(1.029,T-20);  //1/d | growth rate corrected by temperature

  //page 17
  let fxm = 1 - SF*(bAT+1/Rs)/µAmT; //maximum design unaerated sludge mass fraction
  if(fxt>fxm) throw `The mass of unaerated sludge (fxt=${fxt}) cannot be higher than fxm (${fxm})`;

  //unaerated sludge (current and max)
  let MX_unaer_fxt = fxt*MX_T; //kg TSS | actual uneaerated sludge
  let MX_unaer_fxm = fxm*MX_T; //kg TSS | max uneaerated sludge

  //effluent ammonia nitrification
  let Nae_fxt = KnT*(bAT + 1/Rs)/( µAmT*(1-fxt) - bAT - 1/Rs); //mg/L as N | effluent ammonia concentration if fxt <  fxm
  let Nae_fxm = KnT/(SF-1);                                    //mg/L as N | effluent ammonia concentration if fxt == fxm

  //effluent TKN nitrification -- page 18
  let Nte_fxt = Nae_fxt + Nouse; //mg/L as N | effluent TKN concentration if fxt <  fxm
  let Nte_fxm = Nae_fxm + Nouse; //mg/L as N | effluent TKN concentration if fxt == fxm

  //nitrification capacity Nc
  let Nc_fxt = Nti - Ns - Nte_fxt; //mg/L as N | Nitrification capacity if fxt <  fxm
  let Nc_fxm = Nti - Ns - Nte_fxm; //mg/L as N | Nitrification capacity if fxt == fxm

  //oxygen demand
  let FOn_fxt = 4.57*Q*Nc_fxt/1000; //kg/d as O | O demand if fxt <  fxm
  let FOn_fxm = 4.57*Q*Nc_fxm/1000; //kg/d as O | O demand if fxt == fxm

  //results
  return {
    µAmT, KnT, bAT, fxm, 
    MX_unaer_fxt, MX_unaer_fxm, 
    Nae_fxt,      Nae_fxm, 
    Nte_fxt,      Nte_fxm, 
    Nc_fxt,       Nc_fxm,
    FOn_fxt,      FOn_fxm,
  }
};

/*test*/
  let sv = new State_Variables('reactor');
  sv.components.S_VFA  = 50;
  sv.components.S_FBSO = 115;
  sv.components.X_BPO  = 255;
  sv.components.X_UPO  = 10;
  sv.components.S_USO  = 45;
  sv.components.X_iSS  = 15;
  sv.components.S_FSA  = 39.1;
  sv.components.S_OP   = 7.28;
  sv.components.S_NOx  = 0;
  console.log(sv.nitrification());
