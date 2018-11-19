/*
  AS + Nitrification + SST implementation from G. Ekama notes

    Qi → [Activated Sludge + Nitrification + SST] → Qe
                    ↓ 
                    Qw
*/

//import files
if(typeof document == "undefined"){
  State_Variables=require("./state-variables.js");
  require("./activated-sludge.js");
}

State_Variables.prototype.nitrification=function(T,Vp,Rs,RAS,waste_from, SF,fxt,DO,pH){
  /*inputs and default values*/
  //as inputs
  T   = isNaN(T  ) ? 16     : T  ; //ºC   | Temperature
  Vp  = isNaN(Vp ) ? 8473.3 : Vp ; //m3   | Volume
  Rs  = isNaN(Rs ) ? 15     : Rs ; //days | Solids retention time
  RAS = isNaN(RAS) ? 1.0    : RAS; //ø    | SST underflow recycle ratio
  waste_from = waste_from || 'reactor'; //"reactor" or "sst"
  if(['reactor','sst'].indexOf(waste_from)==-1) throw `The input "waste_from" must be equal to "reactor" or "sst" (not "${waste_from}")`;

  //nitrification inputs
  SF  = isNaN(SF ) ? 1.25 : SF ; //safety factor | Design choice. Moves the sludge age.
  fxt = isNaN(fxt) ? 0.39 : fxt; //ratio         | current unaerated sludge mass fraction
  DO  = isNaN(DO ) ? 2.0  : DO ; //mg/L          | DO in the aerobic reactor
  pH  = isNaN(pH ) ? 7.2  : pH ; //pH units

  //influent fractionation
  let frac = this.totals;

  //compute activated sludge without nitrification
  let as = this.activated_sludge(T,Vp,Rs,RAS,waste_from); //Object

  //flowrate
  let Q = this.Q; //ML/d

  //get necessary variables from activated_sludge
  let Nti   = frac.TKN.total;                  //mg/L | total TKN influent
  let Nouse = frac.TKN.usON;                   //mg/L | total N_USO_influent = N_USO_effluent
  let MX_T  = as.process_variables.MX_T.value; //kg   | total sludge produced
  let Ns    = as.process_variables.Ns.value;   //mg/L | N required from sludge production

  //nitrification starts at page 17
  //3 - nitrification kinetics
  const µAm = 0.45;                     //1/d    | growth rate at 20ºC (maximum specific growth rate)
  let µAmT  = µAm*Math.pow(1.123,T-20); //1/d    | growth rate corrected by temperature

  //correct µA by DO
  const K_O = 0.0;                      //mgDO/L | nitrifier Oxygen sensitivity constant 
  let µAmO  = µAmT*DO/(DO+K_O);         //1/d    | growth rate corrected by temperature and DO

  //correct µA by pH inhibition
  const Ki   = 1.13; //page 471
  const Kii  = 0.3;  //page 471
  const Kmax = 9.5;  //page 471
  let µAm_pH = µAmO*Math.pow(2.35, pH-7.2)*Ki*(Kmax-pH)/(Kmax+Kii-pH); //page 471

  const YA = 0.1;                     //gVSS/gFSA | yield coefficient at 20ºC
  let YAT  = YA*Math.pow(1, T-20);    //gVSS/gFSA | yield coefficient corrected by temperature
  const Kn = 1.0;                     //mg/L as N at 20ºC (half saturation coefficient)
  let KnT  = Kn*Math.pow(1.123,T-20); //mg/L as N corrected by temperature
  const bA = 0.04;                    //1/d at 20ºC (endogenous respiration rate)
  let bAT  = bA*Math.pow(1.029,T-20); //1/d | growth rate corrected by temperature

  //page 17
  let fxm = 1 - SF*(bAT+1/Rs)/µAm_pH; //maximum design unaerated sludge mass fraction
  if(fxt>fxm) throw `The mass of unaerated sludge (fxt=${fxt}) cannot be higher than fxm (${fxm})`;

  //minimum sludge age for nitrification (Rsm)
  let Rsm = 1/(µAm_pH*(1-fxt) - bAT); //days

  //unaerated sludge (current and max)
  let MX_unaer_fxt = fxt*MX_T; //kg TSS | actual uneaerated sludge
  let MX_unaer_fxm = fxm*MX_T; //kg TSS | max uneaerated sludge

  //effluent ammonia nitrification
  let Nae_fxt = KnT*(bAT + 1/Rs)/(µAm_pH*(1-fxt)-bAT-1/Rs); //mg/L as N | effluent ammonia concentration if fxt <  fxm
  let Nae_fxm = KnT/(SF-1);                               //mg/L as N | effluent ammonia concentration if fxt == fxm

  //effluent TKN nitrification -- page 18
  let Nte_fxt = Nae_fxt + Nouse; //mg/L as N | effluent TKN concentration if fxt <  fxm
  let Nte_fxm = Nae_fxm + Nouse; //mg/L as N | effluent TKN concentration if fxt == fxm

  //nitrification capacity Nc
  let Nc_fxt = Nti - Ns - Nte_fxt; //mg/L as N | Nitrification capacity if fxt <  fxm
  let Nc_fxm = Nti - Ns - Nte_fxm; //mg/L as N | Nitrification capacity if fxt == fxm

  //oxygen demand
  let FOn_fxt = 4.57*Q*Nc_fxt; //kg/d as O | O demand if fxt <  fxm
  let FOn_fxm = 4.57*Q*Nc_fxm; //kg/d as O | O demand if fxt == fxm

  //page 475 4.14.22.3 book: mass of nitrifiers
  let f_XBA = YAT*Rs/(1+bAT*Rs); //gVSS·d/gFSA
  let MX_BA = Q*Nc_fxt * f_XBA;  //kg VSS
  let X_BA  = MX_BA/Vp;          //kgVSS/m3
  //------------------------------------------------------------------

  //nitrification outputs
  let Qe   = as.effluent.Q;                       //ML/d
  let Qw   = as.wastage.Q;                        //ML/d
  let Suse = as.effluent.components.S_USO;        //mg/L
  let Pse  = as.effluent.components.S_OP;         //mg/L
  let f    = as.process_variables.f.value;        //ø | SST concentrating factor (1+RAS)/RAS or 1 if wasting from reactor
  const fCV_OHO = this.mass_ratios.f_CV_OHO;      //gO/gVSS
  const fCV_UPO = this.mass_ratios.f_CV_UPO;      //gO/gVSS
  const fCV_ANO = this.mass_ratios.f_CV_ANO;      //gO/gVSS
  const fH      = 0.20;                           //tabled value
  let X_BH = as.process_variables.MX_BH.value/Vp; //kg/m3
  let X_EH = as.process_variables.MX_EH.value/Vp; //kg/m3
  let X_I  = as.process_variables.MX_I.value/Vp;  //kg/m3
  let X_IO = as.process_variables.MX_IO.value/Vp; //kg/m3

  let BPO_was = f*fCV_OHO*(1-fH)*X_BH*1000; //mg/L | BPO concentration
  //ask george TODO should we add BPO of ANOs?
  let UPO_was = f*(fCV_OHO*(fH*X_BH + X_EH)+fCV_UPO*X_I)*1000; //mg/L | UPO concentration
  //ask george TODO should we add UPO of ANOs?
  let iSS_was = f*X_IO*1000;                                   //mg/L | iSS concentration
  //ask george TODO should we add iSS of ANOs?

  //create new state variables for effluent and wastage
  //syntax ------------> constructor(Q,  VFA, FBSO, BPO,     UPO,     USO,  iSS,     FSA,     PO4, NOx)
  let effluent = new State_Variables(Qe, 0,   0,    0,       0,       Suse, 0,       Nae_fxt, Pse, Nc_fxt);
  let wastage  = new State_Variables(Qw, 0,   0,    BPO_was, UPO_was, Suse, iSS_was, Nae_fxt, Pse, Nc_fxt);

  //AS process variables
  let as_process_variables = as.process_variables;

  //nitrification process variables
  let process_variables={
    µAmT         :{value:µAmT,         unit:"1/d",       descr:"Growth rate corrected by temperature"},
    µAmO         :{value:µAmO,         unit:"1/d",       descr:"Growth rate corrected by temperature and DO available"},
    µAm_pH       :{value:µAm_pH,       unit:"1/d",       descr:"Growth rate corrected by temperature and DO available and pH"},
    KnT          :{value:KnT,          unit:"mg/L",      descr:"Half saturation constant corrected by temperature"},
    bAT          :{value:bAT,          unit:"1/d",       descr:"Growth rate corrected by temperature"},
    f_XBA        :{value:f_XBA,        unit:"g_VSS·d/g_COD", descr:"Nitrifiers Biomass production rate"},
    fxm          :{value:fxm,          unit:"ratio",     descr:"Maximum design unaerated sludge mass fraction"},
    Rsm          :{value:Rsm,          unit:"d",         descr:"Minimum sludge age for nitrification (below which theoretically nitrification cannot be achiveved)"},
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
    MX_BA        :{value:MX_BA,        unit:"kgANOVSS",    descr:"Mass of Nitrifiers"},
    X_BA         :{value:X_BA,         unit:"kgANOVSS/m3", descr:"Concentration of Nitrifiers"},
  };

  //delete description (debug)
  /*
  */
  Object.values(process_variables).forEach(value=>delete value.descr);
  Object.values(as_process_variables).forEach(value=>delete value.descr);
  return {process_variables, as_process_variables, effluent, wastage};
};

/*test*/
(function(){
  return;
  //state variables syntax     (Q,      VFA, FBSO, BPO, UPO, USO, iSS, FSA,  OP,   NOx)
  let inf = new State_Variables(24.875, 50,  115,  255, 10,  45,  15,  39.1, 7.28, 0  );
  //nitrification syntax      T   Vp      Rs  RAS  waste      SF    fxt   DO   pH
  let nit = inf.nitrification(16, 8473.3, 15, 1.0, 'reactor', 1.25, 0.39, 2.0, 7.2);
  console.log(nit.process_variables);
  return
  console.log(nit.as_process_variables);
  console.log("=== Nitrification effluent summary"); console.log(nit.effluent.summary);
  console.log("=== Nitrification TKN effluent");     console.log(nit.effluent.totals.TKN);
  console.log("=== Nitrification wastage summary");  console.log(nit.wastage.summary);
})();
