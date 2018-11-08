/*
  Nitrification implementation from G. Ekama hand notes
*/

//node imports
if(typeof document == "undefined"){
  State_Variables=require("./state-variables.js");
  require("./activated-sludge.js");
}

State_Variables.prototype.nitrification=function(Q, T, Vp, Rs, SF, fxt){
  //inputs and default values
  Q   = isNaN(Q  ) ? 24875  : Q   ; //m3/d | Flowrate
  T   = isNaN(T  ) ? 16     : T   ; //ºC   | Temperature
  Vp  = isNaN(Vp ) ? 8473.3 : Vp  ; //m3   | Volume
  Rs  = isNaN(Rs ) ? 15     : Rs  ; //days | Solids retention time
  SF  = isNaN(SF ) ? 1.25   : SF  ; //safety factor | Design choice. Moves the sludge age.
  fxt = isNaN(fxt) ? 0.39   : fxt ; //ratio | current unaerated sludge mass fraction

  //compute influent fractionation
  let frac = this.totals;

  //compute activated sludge without nitrification
  let AS_results = this.activated_sludge(Q,T,Vp,Rs);

  //get necessary variables from activated_sludge
  let Nti   = frac.Total_TKN;        //mg/L | total TKN influent
  let Nouse = frac.ON[1].usON;       //mg/L | total N_USO_influent = N_USO_effluent
  let MX_T  = AS_results.MX_T.value; //kg   | total sludge produced
  let Ns    = AS_results.Ns.value;   //mg/L | N required from sludge production

  //nitrification starts at page 17

  //3 - nitrification kinetics
  const µAm = 0.45;                     //1/d | growth rate at 20ºC
  let µAmT  = µAm*Math.pow(1.123,T-20); //1/d | growth rate corrected by temperature
  const Kn  = 1.0;                      //mg/L as N at 20ºC
  let KnT   = Kn*Math.pow(1.123,T-20);  //mg/L as N corrected by temperature
  const bA  = 0.04;                     //1/d at 20ºC
  let bAT   = bA*Math.pow(1.029,T-20);  //1/d | growth rate corrected by temperature

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

  //modificar les variables d'estat TODO

  //nitrification results
  let results={
    µAmT         :{value:µAmT,         unit:"1/d",       descr:"Growth rate corrected by temperature"},
    KnT          :{value:KnT,          unit:"mg/L",      descr:"Kinetic constant corrected by temperature"},
    bAT          :{value:bAT,          unit:"1/d",       descr:"Growth rate corrected by temperature"},
    fxm          :{value:fxm,          unit:"ratio",     descr:"Maximum design unaerated sludge mass fraction"},
    MX_unaer_fxt :{value:MX_unaer_fxt, unit:"kg TSS",    descr:"Current uneaerated sludge mass        (fxt < fxm)"},
    //MX_unaer_fxm :{value:MX_unaer_fxm, unit:"kg TSS",    descr:"Maximum design uneaerated sludge mass (fxt = fxm)"},
    Nae_fxt      :{value:Nae_fxt,      unit:"mg/L as N", descr:"Effluent ammonia concentration        (fxt < fxm)"},
    //Nae_fxm      :{value:Nae_fxm,      unit:"mg/L as N", descr:"Effluent ammonia concentration        (fxt = fxm)"},
    Nte_fxt      :{value:Nte_fxt,      unit:"mg/L as N", descr:"Effluent TKN concentration            (fxt < fxm)"},
    //Nte_fxm      :{value:Nte_fxm,      unit:"mg/L as N", descr:"Effluent TKN concentration            (fxt = fxm)"},
    Nc_fxt       :{value:Nc_fxt,       unit:"mg/L as N", descr:"Nitrification capacity                (fxt < fxm)"},
    //Nc_fxm       :{value:Nc_fxm,       unit:"mg/L as N", descr:"Nitrification capacity                (fxt = fxm)"},
    FOn_fxt      :{value:FOn_fxt,      unit:"kg/d as O", descr:"Oxygen demand                         (fxt < fxm)"},
    //FOn_fxm      :{value:FOn_fxm,      unit:"kg/d as O", descr:"Oxygen demand                         (fxt = fxm)"},
  };

  /*activated sludge results also
    Object.entries(AS_results).forEach(([key,val])=>{
      results[key]=val;
    });
  */

  return results;
};

/*test */
(function test(){
  return;
  let sv = new State_Variables();
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
})();
