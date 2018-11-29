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

State_Variables.prototype.nitrification=function(T,Vp,Rs,RAS,waste_from,mass_FeCl3,SF,fxt,DO,pH){
  /*inputs and default values*/
  //as inputs
  T   = isNaN(T  ) ? 16     : T  ; //ºC   | Temperature
  Vp  = isNaN(Vp ) ? 8473.3 : Vp ; //m3   | Volume
  Rs  = isNaN(Rs ) ? 15     : Rs ; //days | Solids retention time
  RAS = isNaN(RAS) ? 1.0    : RAS; //ø    | SST underflow recycle ratio
  waste_from = waste_from || 'reactor'; //"reactor" or "sst"
  if(['reactor','sst'].indexOf(waste_from)==-1) throw `The input "waste_from" must be equal to "reactor" or "sst" (not "${waste_from}")`;
  mass_FeCl3 = isNaN(mass_FeCl3) ? 50 : mass_FeCl3; //kg/d | mass of FeCl3 added for chemical P removal

  //nitrification inputs
  SF  = isNaN(SF ) ? 1.25 : SF ; //safety factor | Design choice. Moves the sludge age.
  fxt = isNaN(fxt) ? 0.39 : fxt; //ratio         | current unaerated sludge mass fraction
  DO  = isNaN(DO ) ? 2.0  : DO ; //mg/L          | DO in the aerobic reactor
  pH  = isNaN(pH ) ? 7.2  : pH ; //pH units

  //influent fractionation
  let frac = this.totals;

  //execute activated sludge without nitrification
  let as = this.activated_sludge(T,Vp,Rs,RAS,waste_from,mass_FeCl3); //Object{effluent, wastage, process_variables}

  //flowrate
  let Q = this.Q; //ML/d

  //nitrification starts at page 17
  //get necessary TKN fractions
  let Nti   = frac.TKN.total; //mg/L | total TKN influent
  let Nouse = frac.TKN.usON;  //mg/L | total N_USO_influent = N_USO_effluent

  //get necessary variables from activated_sludge
  let MX_T = as.process_variables.MX_T.value; //kg   | total sludge produced
  let Ns   = as.process_variables.Ns.value;   //mg/L | N required from sludge production

  //3 - nitrification kinetics
  const µAm = 0.45;                     //1/d | growth rate at 20ºC (maximum specific growth rate)
  let µAmT  = µAm*Math.pow(1.123,T-20); //1/d | growth rate corrected by temperature

  //correct µA by DO (book page 468)
  const K_O = 0.3;              //mgDO/L | nitrifier Oxygen sensitivity constant TODO current value does not turn off nitrification
  let µAmO  = µAmT*DO/(DO+K_O); //1/d    | growth rate corrected by temperature and DO

  //correct µA by pH inhibition
  const Ki   = 1.13; //page 471
  const Kii  = 0.3;  //page 471
  const Kmax = 9.5;  //page 471
  let µAm_pH = µAmO*Math.pow(2.35, pH-7.2)*Ki*(Kmax-pH)/(Kmax+Kii-pH); //page 471

  //K's and endogenous respiration kinetics
  const YA = 0.1;                     //gVSS/gFSA | yield coefficient at 20ºC
  let YAT  = YA*Math.pow(1, T-20);    //gVSS/gFSA | yield coefficient corrected by temperature
  const Kn = 1.0;                     //mg/L as N at 20ºC (half saturation coefficient)
  let KnT  = Kn*Math.pow(1.123,T-20); //mg/L as N corrected by temperature
  const bA = 0.04;                    //1/d at 20ºC (endogenous respiration rate)
  let bAT  = bA*Math.pow(1.029,T-20); //1/d | growth rate corrected by temperature

  //page 17
  //maximum design unaerated sludge mass fraction
  let fxm = 1 - SF*(bAT+1/Rs)/µAm_pH; //ø
  //if(fxt>fxm) throw `The mass of unaerated sludge (fxt=${fxt}) cannot be higher than fxm (${fxm})`;

  //minimum sludge age for nitrification (Rsm)
  let Rsm = SF/(µAm_pH*(1-fxt) - bAT); //days
  //if(Rs<Rsm) throw `The sludge age (Rs=${Rs}) cannot be lower than the minimum sludge age (Rsm=${Rsm})`;

  //unaerated sludge (current and max)
  let MX_T_fxt = fxt*MX_T; //kg TSS | actual uneaerated sludge
  let MX_T_fxm = fxm*MX_T; //kg TSS | max uneaerated sludge

  //effluent ammonia nitrification
  let Nae_fxt = KnT*(bAT + 1/Rs)/(µAm_pH*(1-fxt)-bAT-1/Rs); //mg/L as N | effluent ammonia concentration if fxt <  fxm
  let Nae_fxm = KnT/(SF-1);                                 //mg/L as N | effluent ammonia concentration if fxt == fxm

  //effluent TKN nitrification -- page 18
  let Nte_fxt = Nae_fxt + Nouse; //mg/L as N | effluent TKN concentration if fxt <  fxm
  let Nte_fxm = Nae_fxm + Nouse; //mg/L as N | effluent TKN concentration if fxt == fxm

  //nitrification capacity Nc
  let Nc_fxt = Nti - Ns - Nte_fxt; //mg/L as N | Nitrification capacity if fxt <  fxm
  let Nc_fxm = Nti - Ns - Nte_fxm; //mg/L as N | Nitrification capacity if fxt == fxm

  //oxygen demand
  let FOn_fxt = 4.57*Q*Nc_fxt; //kgO/d | O demand if fxt <  fxm
  let FOn_fxm = 4.57*Q*Nc_fxm; //kgO/d | O demand if fxt == fxm
  let FOc     = as.process_variables.FOc.value; //kg=/d
  let FOt_fxt = FOc + FOn_fxt; //kgO/d | total O demand if fxt <  fxm
  let FOt_fxm = FOc + FOn_fxm; //kgO/d | total O demand if fxt == fxm

  //page 475 4.14.22.3 book: calculate mass of nitrifiers
  let f_XBA = YAT*Rs/(1+bAT*Rs); //gVSS·d/gFSA
  let MX_BA = Q*Nc_fxt * f_XBA;  //kg VSS
  let X_BA  = MX_BA/Vp;          //kgVSS/m3
  //end nitrification -----------------------------------

  //prepare nitrification outputs
  let Qe   = as.effluent.Q;                //ML/d
  let Qw   = as.wastage.Q;                 //ML/d
  let Suse = as.effluent.components.S_USO; //mg/L
  let Pse  = as.effluent.components.S_OP;  //mg/L

  //concentration of particulated fractions in wastage
  let BPO_was = as.wastage.components.X_BPO; //mg/L | BPO concentration
  let UPO_was = as.wastage.components.X_UPO; //mg/L | UPO concentration
  let iSS_was = as.wastage.components.X_iSS; //mg/L | iSS concentration
  //ask george TODO if we should add BPO of ANOs
  //ask george TODO if we should add UPO of ANOs
  //ask george TODO if we should add iSS of ANOs

  //FBSO from previous step
  let S_b = as.effluent.components.S_FBSO; //mg/L of bCOD not degraded

  //create output state variables (effluent, wastage)
  //syntax--------------------------(Q,  VFA, FBSO, BPO,     UPO,     USO,  iSS,     FSA,     PO4, NOx)
  let effluent = new State_Variables(Qe, 0,   S_b,  0,       0,       Suse, 0,       Nae_fxt, Pse, Nc_fxt);
  let wastage  = new State_Variables(Qw, 0,   S_b,  BPO_was, UPO_was, Suse, iSS_was, Nae_fxt, Pse, Nc_fxt);

  //pack nitrification process variables
  let process_variables={
    µAmT     :{value:µAmT,     unit:"1/d",         descr:"Growth rate corrected by temperature"},
    µAmO     :{value:µAmO,     unit:"1/d",         descr:"Growth rate corrected by: temperature + DO available"},
    µAm_pH   :{value:µAm_pH,   unit:"1/d",         descr:"Growth rate corrected by: temperature + DO available + pH"},
    KnT      :{value:KnT,      unit:"mg/L",        descr:"Half saturation constant corrected by temperature"},
    bAT      :{value:bAT,      unit:"1/d",         descr:"Growth rate corrected by temperature"},
    f_XBA    :{value:f_XBA,    unit:"gVSS·d/gCOD", descr:"Nitrifiers Biomass production rate"},
    fxt      :{value:fxt,      unit:"ø",           descr:"Current unaerated sludge mass fraction"},
    fxm      :{value:fxm,      unit:"ø",           descr:"Maximum design unaerated sludge mass fraction"},
    Rs       :{value:Rs ,      unit:"d",           descr:"Current sludge age"},
    Rsm      :{value:Rsm,      unit:"d",           descr:"Minimum sludge age for nitrification (below which theoretically nitrification cannot be achiveved)"},
    MX_T_fxt :{value:MX_T_fxt, unit:"kgTSS",       descr:"Current uneaerated sludge mass (if fxt < fxm)"},
    MX_T_fxm :{value:MX_T_fxm, unit:"kgTSS",       descr:"Maximum design uneaerated sludge mass (if fxt = fxm)"},
    Nae_fxt  :{value:Nae_fxt,  unit:"mgN/L",       descr:"Effluent ammonia concentration (if fxt < fxm)"},
    Nae_fxm  :{value:Nae_fxm,  unit:"mgN/L",       descr:"Effluent ammonia concentration (if fxt = fxm)"},
    Nte_fxt  :{value:Nte_fxt,  unit:"mgN/L",       descr:"Effluent TKN concentration (if fxt < fxm)"},
    Nte_fxm  :{value:Nte_fxm,  unit:"mgN/L",       descr:"Effluent TKN concentration (if fxt = fxm)"},
    Nc_fxt   :{value:Nc_fxt,   unit:"mgN/L",       descr:"Nitrification capacity (if fxt < fxm)"},
    Nc_fxm   :{value:Nc_fxm,   unit:"mgN/L",       descr:"Nitrification capacity (if fxt = fxm)"},
    FOn_fxt  :{value:FOn_fxt,  unit:"kgO/d",       descr:"Nitrogenous Oxygen demand (if fxt < fxm)"},
    FOn_fxm  :{value:FOn_fxm,  unit:"kgO/d",       descr:"Nitrogenous Oxygen demand (if fxt = fxm)"},
    FOt_fxt  :{value:FOt_fxt,  unit:"kgO/d",       descr:"Total Oxygen demand (if fxt < fxm)"},
    FOt_fxm  :{value:FOt_fxm,  unit:"kgO/d",       descr:"Total Oxygen demand (if fxt = fxm)"},
    MX_BA    :{value:MX_BA,    unit:"kgVSS",       descr:"Mass of Nitrifiers"},
    X_BA     :{value:X_BA,     unit:"kgVSS/m3",    descr:"Concentration of Nitrifiers"},
  };

  //hide description (debug)
  //Object.values(process_variables).forEach(obj=>delete obj.descr);
  return {
    process_variables,
    as_process_variables: as.process_variables,
    cpr: as.cpr,
    effluent,
    wastage,
  };
};

/*test*/
(function(){
  return;
  //syntax---------------------(Q       VFA FBSO BPO  UPO USO iSS FSA   OP    NOx)
  let inf = new State_Variables(24.875, 50, 115, 255, 10, 45, 15, 39.1, 7.28, 0  );
  //syntax-------------------(T   Vp      Rs  RAS  waste      mass_FeCl3, SF    fxt   DO   pH)
  let nit = inf.nitrification(16, 8473.3, 15, 1.0, 'reactor', 3000,       1.25, 0.39, 2.0, 7.2);
  //console.log(nit.effluent.components);
  //return;
  //print results
  console.log(nit.process_variables);
  console.log(nit.as_process_variables);
  console.log(nit.cpr);
  return
  console.log("=== AS+NIT effluent summary"); console.log(nit.effluent.summary);
  console.log("=== AS+NIT TKN effluent");     console.log(nit.effluent.totals.TKN);
  console.log("=== AS+NIT wastage summary");  console.log(nit.wastage.summary);
})();
