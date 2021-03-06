/*
  STATE VARIABLES CLASS
  represents just a stream of water with components (contaminants)

  Each removal technology is a method implemented in
  its own file (e.g. nitrification.js) as
  "State_Variables.prototype.technology_name=function(){implementation}"
  exapmles:
    "primary-settler"     --> is called as "obj.primary_settler(parameters)"
    "activated-sludge"    --> is called as "obj.activated_sludge(parameters)"
    "chemical-P-removal"  --> is called as "obj.
    "nitrification"       --> is called as "obj.
    "denitrification"     --> is called as "obj.
    "bio-P-removal"       --> is called as "obj.

  each technology returns 2 state variable objects: effluent and wastage
  also each technology returns  a list of "process_variables"

  A State_Variables oject represents an arrow in a WWTP model, for example:
    Qi → [PST] → [AS] → [nitrification] → Qe
          ↓       ↓      ↓
          Qw      Qw     Qw

  Summary of this file:
    1. data structure
      - Q value
      - components substructure
      - mass ratios substructure
    2. class methods
      - set
      - totals
      - fluxes
      - summary
      - combine
    3. tests
*/

class State_Variables {
  constructor(Q,
    S_VFA, S_FBSO, X_BPO, X_UPO, S_USO, //COD fractions
    X_iSS, S_NH4, S_PO4, S_NOx, S_O2,   //inorganic components
    X_OHO, X_PAO                        //alive biomass
  ){
    //numeric input checks
    if(Q      < 0) throw new Error(`Value for Flowrate (Q=${Q}) not allowed`);
    if(S_VFA  < 0) throw new Error(`Value for volatile fatty acids (S_VFA=${S_VFA}) not allowed`);
    if(S_FBSO < 0) throw new Error(`Value for fermentable biodegradable soluble organics (S_FBSO=${S_FBSO}) not allowed`);
    if(X_BPO  < 0) throw new Error(`Value for biodegradable particulated organics (X_BPO=${X_BPO}) not allowed`);
    if(X_UPO  < 0) throw new Error(`Value for unbiodegradable particulated organics (X_UPO=${X_UPO}) not allowed`);
    if(S_USO  < 0) throw new Error(`Value for unbiodegradable soluble organics (S_USO=${S_USO}) not allowed`);
    if(X_iSS  < 0) throw new Error(`Value for inert suspended solids (X_iSS=${X_iSS}) not allowed`);
    if(S_NH4  < 0) throw new Error(`Value for free saline ammonia (S_NH4=${S_NH4}) not allowed`);
    if(S_PO4  < 0) throw new Error(`Value for orthophosphate (S_PO4=${S_PO4}) not allowed`);
    if(S_NOx  < 0) throw new Error(`Value for nitrate/nitrite (S_NOx=${S_NOx}) not allowed`);
    if(S_O2   < 0) throw new Error(`Value for dissolved oxygen (S_O2=${S_O2}) not allowed`);
    if(X_OHO  < 0) throw new Error(`Value for ordinary heterotrophic organisms (X_OHO=${X_OHO}) not allowed`);
    if(X_PAO  < 0) throw new Error(`Value for polyphosphate accumulating organisms (X_PAO=${X_PAO}) not allowed`);

    //FLOWRATE
    this.Q = isNaN(Q) ? 0 : Q; //ML/d

    //ACTUAL STATE VARIABLES
    this.components={
      S_VFA : isNaN(S_VFA ) ? 0 : S_VFA ,//mg/L | Biodegradable   Soluble     Organics (BSO) (volatile fatty acids)
      S_FBSO: isNaN(S_FBSO) ? 0 : S_FBSO,//mg/L | Biodegradable   Soluble     Organics (BSO) (fermentable organics)
      X_BPO : isNaN(X_BPO ) ? 0 : X_BPO ,//mg/L | Biodegradable   Particulate Organics (BPO)
      X_UPO : isNaN(X_UPO ) ? 0 : X_UPO ,//mg/L | Unbiodegradable Particulate Organics (UPO)
      S_USO : isNaN(S_USO ) ? 0 : S_USO ,//mg/L | Unbiodegradable Soluble     Organics (USO)
      X_iSS : isNaN(X_iSS ) ? 0 : X_iSS ,//mg/L | Inert Suspended Solids (sand)
      S_NH4 : isNaN(S_NH4 ) ? 0 : S_NH4 ,//mg/L | Inorganic Free Saline Ammonia (NH4)
      S_PO4 : isNaN(S_PO4 ) ? 0 : S_PO4 ,//mg/L | Inorganic OrthoPhosphate (PO4)
      S_NOx : isNaN(S_NOx ) ? 0 : S_NOx ,//mg/L | Inorganic Nitrite and Nitrate (NO2 + NO3) (not part of TKN)
      S_O2  : isNaN(S_O2  ) ? 0 : S_O2  ,//mg/L | Dissolved O2
      X_OHO : isNaN(X_OHO ) ? 0 : X_OHO ,//mg/L | Ordinary Heterotrophic Organisms (expressed as COD) influent OHO should always be 0 (model assumption)
      X_PAO : isNaN(X_PAO ) ? 0 : X_PAO ,//mg/L | Polyphosphate Accumulating Organisms (expressed as COD) influent PAO should always be 0 (model assumption)
    };

    //VSS MASS RATIOS
    this.mass_ratios={
      /*----+------------------+----------------+-----------------+-----------------+
      |     | COD              | C              | N               | P               |
      +-----+------------------+----------------+-----------------+-----------------*/
      /*VFA*/ f_CV_VFA : 1.0667, f_C_VFA : 0.400, f_N_VFA : 0.0000, f_P_VFA : 0.0000, // BSO
      /*FBS*/ f_CV_FBSO: 1.4200, f_C_FBSO: 0.471, f_N_FBSO: 0.0464, f_P_FBSO: 0.0118, // BSO
      /*BPO*/ f_CV_BPO : 1.5230, f_C_BPO : 0.498, f_N_BPO : 0.0323, f_P_BPO : 0.0072, // BPO
      /*USO*/ f_CV_USO : 1.4930, f_C_USO : 0.498, f_N_USO : 0.0366, f_P_USO : 0.0000, // USO
      /*UPO*/ f_CV_UPO : 1.4810, f_C_UPO : 0.518, f_N_UPO : 0.1000, f_P_UPO : 0.0250, // UPO
      /*OHO*/ f_CV_OHO : 1.4810, f_C_OHO : 0.518, f_N_OHO : 0.1000, f_P_OHO : 0.0250, // Ordinary Heterotrophic Organisms
      /*PAO*/ f_CV_PAO : 1.4810, f_C_PAO : 0.518, f_N_PAO : 0.1000, f_P_PAO : 0.3800, // Phosphate Accumulating Organisms
      ///*NIT*/ f_CV_NIT : 1.4810, f_C_NIT : 0.518, f_N_NIT : 0.1000, f_P_NIT : 0.0250, // Ammonia Oxidizing Organisms
      /*----------------------------------------------------------------------------*/
    };
  };

  //update a state variable value. example -> sv.set("S_VFA",10);
  set(key, newValue){ //->void
    if(this.components[key]===undefined) throw new Error(`component "${key}" not found`);
    if(typeof newValue != 'number')      throw new Error(`component "${key}" newValue ("${newValue}") is not a number`);
    if(newValue < 0)                     throw new Error(`component "${key}" newValue ("${newValue}") is negative`);
    //update state variable value
    this.components[key]=newValue;
  };

  //calculate complete fractionation for [COD, TKN, TP, TOC,TSS]
  get totals(){
    let mr=this.mass_ratios;//alias "mass ratios"
    let co=this.components; //alias "components"

    //COD fractions (Chemical Oxygen Demand)
      let bsCOD = co.S_VFA + co.S_FBSO; //biodg + soluble COD
      let usCOD = co.S_USO;             //unbgd + soluble COD
      let bpCOD = co.X_BPO;             //biodg + partic  COD
      let upCOD = co.X_UPO;             //unbgd + partic  COD
      let  bCOD = bsCOD + bpCOD;        //biodg           COD
      let  uCOD = usCOD + upCOD;        //unbgd           COD
      let  sCOD = bsCOD + usCOD;        //soluble         COD
      let  pCOD = bpCOD + upCOD;        //partic          COD
      let Total_COD = bsCOD + usCOD + bpCOD + upCOD + co.X_OHO + co.X_PAO;
      let COD={
        total: Total_COD,
        bCOD,  uCOD,  sCOD,  pCOD,
        bsCOD, usCOD, bpCOD, upCOD,
        active: co.X_OHO + co.X_PAO,
      };

    //TOC all fractions (Total Organic Carbon)
      let bsOC  = co.S_VFA *mr.f_C_VFA /mr.f_CV_VFA +
                  co.S_FBSO*mr.f_C_FBSO/mr.f_CV_FBSO; //bio + soluble OC
      let usOC  = co.S_USO*mr.f_C_USO/mr.f_CV_USO;    //unbio + soluble OC
      let bpOC  = co.X_BPO*mr.f_C_BPO/mr.f_CV_BPO;    //bio   + partic  OC
      let upOC  = co.X_UPO*mr.f_C_UPO/mr.f_CV_UPO;    //unbio + partic  OC
      let  bOC  = bsOC + bpOC;                        //bio             OC
      let  uOC  = usOC + upOC;                        //unbio           OC
      let  sOC  = bsOC + usOC;                        //soluble         OC
      let  pOC  = bpOC + upOC;                        //partic          OC
      let actOC = co.X_OHO*mr.f_C_OHO/mr.f_CV_OHO +   //OC in active biomass (OHO)
                  co.X_PAO*mr.f_C_PAO/mr.f_CV_PAO;    //OC in active biomass (PAO)
      let Total_TOC = bsOC + usOC + bpOC + upOC + actOC;
      let TOC={
        total:Total_TOC,
        bOC,  uOC,  sOC,  pOC,
        bsOC, usOC, bpOC, upOC,
        active: actOC,
      };

    //TKN all fractions (Organic Nitrogen (ON) + Inorganic Free Saline Ammonia (NH4))
      let bsON  = co.S_VFA *mr.f_N_VFA /mr.f_CV_VFA +
                  co.S_FBSO*mr.f_N_FBSO/mr.f_CV_FBSO; //bio   + soluble ON
      let usON  = co.S_USO*mr.f_N_USO/mr.f_CV_USO;    //unbio + soluble ON
      let bpON  = co.X_BPO*mr.f_N_BPO/mr.f_CV_BPO;    //bio   + partic  ON
      let upON  = co.X_UPO*mr.f_N_UPO/mr.f_CV_UPO;    //unbio + partic  ON
      let  bON  = bsON + bpON;                        //biodegradable   ON
      let  uON  = usON + upON;                        //unbiodegradable ON
      let  sON  = bsON + usON;                        //soluble         ON
      let  pON  = bpON + upON;                        //partic          ON
      let actON = co.X_OHO*mr.f_N_OHO/mr.f_CV_OHO+    //ON in active biomass (OHO)
                  co.X_PAO*mr.f_N_PAO/mr.f_CV_PAO;    //ON in active biomass (PAO)
      let Total_TKN = co.S_NH4 + bsON + usON + bpON + upON + actON;
      let TKN={
        total:Total_TKN,
        NH4:co.S_NH4,
        ON:sON+pON,
        bON,  uON,  sON,  pON,
        bsON, usON, bpON, upON,
        active: actON,
      }

    //TN = TKN + NOx
      let TN = {
        total: Total_TKN + this.components.S_NOx,
        TKN: Total_TKN,
        NOx: this.components.S_NOx,
      };

    //TP all fractions (Organic P (OP) + Inorganic Phosphate (PO4))
      let bsOP  = co.S_VFA *mr.f_P_VFA /mr.f_CV_VFA +
                  co.S_FBSO*mr.f_P_FBSO/mr.f_CV_FBSO; //bio + soluble OP
      let usOP  = co.S_USO*mr.f_P_USO/mr.f_CV_USO;    //unbio + soluble OP
      let bpOP  = co.X_BPO*mr.f_P_BPO/mr.f_CV_BPO;    //bio   + partic  OP
      let upOP  = co.X_UPO*mr.f_P_UPO/mr.f_CV_UPO;    //unbio + partic  OP
      let  bOP  = bsOP + bpOP;                        //biodegradable   OP
      let  uOP  = usOP + upOP;                        //unbiodegradable OP
      let  sOP  = bsOP + usOP;                        //soluble         OP
      let  pOP  = bpOP + upOP;                        //partic          OP
      let actOP = co.X_OHO*mr.f_P_OHO/mr.f_CV_OHO +   //OP in active biomass (OHO)
                  co.X_PAO*mr.f_P_PAO/mr.f_CV_PAO;    //OP in active biomass (PAO)
      let Total_TP = co.S_PO4 + bsOP + usOP + bpOP + upOP + actOP;
      let TP={
        total: Total_TP,
        PO4:   co.S_PO4,
        OP:    sOP+pOP,
        bOP,  uOP,  sOP,  pOP,
        bsOP, usOP, bpOP, upOP,
        active: actOP,
      };

    //TSS all fractions (Volatile Suspended Solids (VSS) + inert Suspended Solids (iSS))
      let bVSS   = co.X_BPO/mr.f_CV_BPO;    //biodegradable   VSS
      let uVSS   = co.X_UPO/mr.f_CV_UPO;    //unbiodegradalbe VSS
      let actVSS = co.X_OHO/mr.f_CV_OHO +   //OHO VSS active biomass
                   co.X_PAO/mr.f_CV_PAO;    //PAO VSS active biomass
      let Total_VSS = bVSS + uVSS + actVSS; //total VSS
      let Total_TSS = Total_VSS + co.X_iSS; //total TSS
      let TSS={
        total:  Total_TSS,
        active: actVSS,
        iSS:    co.X_iSS,
        VSS:    Total_VSS,
        bVSS,
        uVSS,
      };

    //pack components
    return {COD,TKN,TN,TP,TOC,TSS};
  };

  //convert "components" (mg/L) and "totals" (mg/L) to mass fluxes (kg/d)
  get fluxes(){
    let components = {};
    let totals     = {};

    //components
    Object.entries(this.components).forEach(([key,value])=>{
      components[key]=this.Q*value;
    });

    //totals
    Object.entries(this.totals).forEach(([group_name,group])=>{
      totals[group_name]={};
      //group names are [COD,TKN,TP,TOC,TSS]
      //keys are components of "group_name"
      Object.entries(group).forEach(([key,val])=>{
        totals[group_name][key]=this.Q*val;
      });
    });

    return {components, totals};
  }

  //summary table (concentrations and fluxes) for important components
  get summary(){
    let totals     = this.totals;     //object | concentrations (mg/L)
    let fluxes     = this.fluxes;     //object | mass fluxes (kg/d)
    let components = this.components; //object | concentrations
    return {
      Q:   this.Q,
      COD: [totals.COD.total, fluxes.totals.COD.total],  //chemical oxygen demand
      TKN: [totals.TKN.total, fluxes.totals.TKN.total],  //total kjeldahl nitrogen
      NH4: [totals.TKN.NH4,   fluxes.totals.TKN.NH4],    //inorganic nitrogen (NH4 or free saline ammonia or FSA)
      NOx: [components.S_NOx, fluxes.components.S_NOx],  //nitrate (NO3) and nitrite (NO2) is not TKN
      TN:  [totals.TN.total,  fluxes.totals.TN.total],   //total nitrogen
      O2:  [components.S_O2,  fluxes.components.S_O2],   //dissolved oxygen
      TP:  [totals.TP.total,  fluxes.totals.TP.total],   //total phosphorus
      PO4: [totals.TP.PO4,    fluxes.totals.TP.PO4],     //inorganic phosphorus
      TOC: [totals.TOC.total, fluxes.totals.TOC.total],  //total organic carbon
      VSS: [totals.TSS.VSS,   fluxes.totals.TSS.VSS],    //volatile suspended solids
      iSS: [totals.TSS.iSS,   fluxes.totals.TSS.iSS],    //inorganic suspended solids
      TSS: [totals.TSS.total, fluxes.totals.TSS.total],  //total suspended solids
    }
  }

  //combine 2 state variable objects (2 flows)
  combine(sv){
    //check sv
    if(sv.constructor!==State_Variables){
      throw "input is not a State Variables object";
    }

    //new state variables empty object
    const new_sv = new State_Variables();

    //new flowrate
    const Q = this.Q + sv.Q;
    new_sv.Q = Q;

    //new concentrations: mass flux divided by the new Q
    Object.keys(this.components).forEach(key=>{
      let mass = 0;
      mass += this.Q * this.components[key];
      mass +=   sv.Q *   sv.components[key];
      new_sv.set(key,mass/Q); //set new concentration
    });
    return new_sv;
  }

  //units and descriptions. Syntax--> let info = State_Variables.info; console.log(info.components.S_VFA.unit);
  static get info(){
    return {
      Q:{unit:"ML/d", descr:"Flowrate"},
      components:{
        S_VFA :{unit:"mgCOD/L", descr:"Volatile Fatty Acids (part of Biodegradable Soluble Organics)"},
        S_FBSO:{unit:"mgCOD/L", descr:"Fermentable Organics (part of Biodegradable Soluble Organics)"},
        X_BPO :{unit:"mgCOD/L", descr:"Biodegradable Particulated Organics"},
        X_UPO :{unit:"mgCOD/L", descr:"Unbiodegradable Particulated Organics"},
        S_USO :{unit:"mgCOD/L", descr:"Unbiodegradable Soluble Organics"},
        X_iSS :{unit:"mgiSS/L", descr:"Inert Suspended Solids"},
        S_NH4 :{unit:"mgN/L",   descr:"Inorganic Free Saline Ammonia, FSA"},
        S_PO4 :{unit:"mgP/L",   descr:"Inorganic OrthoPhosphate"},
        S_NOx :{unit:"mgN/L",   descr:"Inorganic Nitrite and Nitrate (NO2 + NO3)"},
        S_O2  :{unit:"mgO/L",   descr:"Dissolved Oxygen"},
        X_OHO :{unit:"mgCOD/L", descr:"Ordinary Heterotrophic Organisms (expressed in COD units)"},
        X_PAO :{unit:"mgCOD/L", descr:"Polyphosphate Accumulating Organisms (expressed in COD units)"},
      },
      mass_ratios:{
        f_CV_VFA :{unit:"gCOD/gVSS",descr:"COD from S_VFA/VSS mass ratio"},
        f_C_VFA  :{unit:"gC/gVSS",  descr:"C from S_VFA/VSS mass ratio"},
        f_N_VFA  :{unit:"gN/gVSS",  descr:"N from S_VFA/VSS mass ratio"},
        f_P_VFA  :{unit:"gP/gVSS",  descr:"P from S_VFA/VSS mass ratio"},
        f_CV_FBSO:{unit:"gCOD/gVSS",descr:"COD from S_FBSO/VSS mass ratio"},
        f_C_FBSO :{unit:"gC/gVSS",  descr:"C from S_FBSO/VSS mass ratio"},
        f_N_FBSO :{unit:"gN/gVSS",  descr:"N from S_FBSO/VSS mass ratio"},
        f_P_FBSO :{unit:"gP/gVSS",  descr:"P from S_FBSO/VSS mass ratio"},
        f_CV_BPO :{unit:"gCOD/gVSS",descr:"COD from X_BPO/VSS mass ratio"},
        f_C_BPO  :{unit:"gC/gVSS",  descr:"C from X_BPO/VSS mass ratio"},
        f_N_BPO  :{unit:"gN/gVSS",  descr:"N from X_BPO/VSS mass ratio"},
        f_P_BPO  :{unit:"gP/gVSS",  descr:"P from X_BPO/VSS mass ratio"},
        f_CV_UPO :{unit:"gCOD/gVSS",descr:"COD from X_UPO/VSS mass ratio"},
        f_C_UPO  :{unit:"gC/gVSS",  descr:"C from X_UPO/VSS mass ratio"},
        f_N_UPO  :{unit:"gN/gVSS",  descr:"N from X_UPO/VSS mass ratio"},
        f_P_UPO  :{unit:"gP/gVSS",  descr:"P from X_UPO/VSS mass ratio"},
        f_CV_USO :{unit:"gCOD/gVSS",descr:"COD from S_USO/VSS mass ratio"},
        f_C_USO  :{unit:"gC/gVSS",  descr:"C from S_USO/VSS mass ratio"},
        f_N_USO  :{unit:"gN/gVSS",  descr:"N from S_USO/VSS mass ratio"},
        f_P_USO  :{unit:"gP/gVSS",  descr:"P from S_USO/VSS mass ratio"},
        f_CV_OHO :{unit:"gCOD/gVSS",descr:"COD from X_OHO/VSS mass ratio"},
        f_C_OHO  :{unit:"gC/gVSS",  descr:"C from X_OHO/VSS mass ratio"},
        f_N_OHO  :{unit:"gN/gVSS",  descr:"N from X_OHO/VSS mass ratio"},
        f_P_OHO  :{unit:"gP/gVSS",  descr:"P from X_OHO/VSS mass ratio"},
        f_CV_PAO :{unit:"gCOD/gVSS",descr:"COD from X_PAO/VSS mass ratio"},
        f_C_PAO  :{unit:"gC/gVSS",  descr:"C from X_PAO/VSS mass ratio"},
        f_N_PAO  :{unit:"gN/gVSS",  descr:"N from X_PAO/VSS mass ratio"},
        f_P_PAO  :{unit:"gP/gVSS",  descr:"P from X_PAO/VSS mass ratio"},
        //f_CV_NIT :{unit:"gCOD/gVSS",descr:"COD from X_NIT/VSS mass ratio"},
        //f_C_NIT  :{unit:"gC/gVSS",  descr:"C from X_NIT/VSS mass ratio"},
        //f_N_NIT  :{unit:"gN/gVSS",  descr:"N from X_NIT/VSS mass ratio"},
        //f_P_NIT  :{unit:"gP/gVSS",  descr:"P from X_NIT/VSS mass ratio"},
      },
      totals:{
        bsCOD  : {unit:"mgCOD/L", descr:"Biodegradable Soluble COD"},
        usCOD  : {unit:"mgCOD/L", descr:"Unbiodegradable Soluble COD"},
        bpCOD  : {unit:"mgCOD/L", descr:"Biodegradable Particulated COD"},
        upCOD  : {unit:"mgCOD/L", descr:"Unbiodegradable Particulated COD"},
         bCOD  : {unit:"mgCOD/L", descr:"Biodegradable COD (Soluble + Particulated)"},
         uCOD  : {unit:"mgCOD/L", descr:"Unbiodegradable COD (Soluble + Particulated)"},
         sCOD  : {unit:"mgCOD/L", descr:"Soluble COD (Biodegradable + Unbiodegradable)"},
         pCOD  : {unit:"mgCOD/L", descr:"Particulated COD (Biodegradable + Unbiodegradable)"},

        bsOC   : {unit:"mgC/L", descr:"Biodegradable Soluble Organic Carbon"},
        usOC   : {unit:"mgC/L", descr:"Unbiodegradable Soluble Organic Carbon"},
        bpOC   : {unit:"mgC/L", descr:"Biodegradable Particulated Organic Carbon"},
        upOC   : {unit:"mgC/L", descr:"Unbiodegradable Particulated Organic Carbon"},
         bOC   : {unit:"mgC/L", descr:"Biodegradable Organic Carbon (Soluble + Particulated)"},
         uOC   : {unit:"mgC/L", descr:"Unbiodegradable Organic Carbon (Soluble + Particulated)"},
         sOC   : {unit:"mgC/L", descr:"Soluble Organic Carbon (Biodegradable + Unbiodegradable)"},
         pOC   : {unit:"mgC/L", descr:"Particulated Organic Carbon (Biodegradable + Unbiodegradable)"},
        actOC  : {unit:"mgC/L", descr:"Organic Carbon in active biomass"},

        bsON   : {unit:"mgN/L", descr:"Biodegradable Soluble Organic Nitrogen"},
        usON   : {unit:"mgN/L", descr:"Unbiodegradable Soluble Organic Nitrogen"},
        bpON   : {unit:"mgN/L", descr:"Biodegradable Particulated Organic Nitrogen"},
        upON   : {unit:"mgN/L", descr:"Unbiodegradable Particulated Organic Nitrogen"},
         bON   : {unit:"mgN/L", descr:"Biodegradable Organic Nitrogen (Soluble + Particulated)"},
         uON   : {unit:"mgN/L", descr:"Unbiodegradable Organic Nitrogen (Soluble + Particulated)"},
         sON   : {unit:"mgN/L", descr:"Soluble Organic Nitrogen (Biodegradable + Unbiodegradable)"},
         pON   : {unit:"mgN/L", descr:"Particulated Organic Nitrogen (Biodegradable + Unbiodegradable)"},
        actON  : {unit:"mgN/L", descr:"Organic Nitrogen in active biomass"},

        bsOP   : {unit:"mgP/L", descr:"Biodegradable Soluble Organic Phosphorus"},
        usOP   : {unit:"mgP/L", descr:"Unbiodegradable Soluble Organic Phosphorus"},
        bpOP   : {unit:"mgP/L", descr:"Biodegradable Particulated Organic Phosphorus"},
        upOP   : {unit:"mgP/L", descr:"Unbiodegradable Particulated Organic Phosphorus"},
         bOP   : {unit:"mgP/L", descr:"Biodegradable Organic Phosphorus (Soluble + Particulated)"},
         uOP   : {unit:"mgP/L", descr:"Unbiodegradable Organic Phosphorus (Soluble + Particulated)"},
         sOP   : {unit:"mgP/L", descr:"Soluble Organic Phosphorus (Biodegradable + Unbiodegradable)"},
         pOP   : {unit:"mgP/L", descr:"Particulated Organic Phosphorus (Biodegradable + Unbiodegradable)"},
        actOP  : {unit:"mgP/L", descr:"Organic Phosphorus in active biomass"},

        bVSS   : {unit:"mgVSS/L", descr:"Biodegradable VSS"},
        uVSS   : {unit:"mgVSS/L", descr:"Unbiodegradable VSS"},
        actVSS : {unit:"mgVSS/L", descr:"OHO VSS active biomass"},
      },
      summary:{
        COD :{unit:"mgCOD/L", descr:"Total Chemical Oxygen Demand"},
        TKN :{unit:"mgN/L",   descr:"Total Kjeldahl Nitrogen"     },
        NH4 :{unit:"mgN/L",   descr:"Free Saline Ammonia"         },
        NOx :{unit:"mgN/L",   descr:"Nitrate and nitrite"         },
        TN  :{unit:"mgN/L",   descr:"Total Nitrogen (TKN+NOx)"    },
        TP  :{unit:"mgP/L",   descr:"Total Phosphorus"            },
        PO4 :{unit:"mgP/L",   descr:"Total Phosphorus"            },
        TOC :{unit:"mgC/L",   descr:"Total Organic Carbon"        }, 
        TSS :{unit:"mgTSS/L", descr:"Total Suspended Solids"      },
      },
    }
  }
}

//export class
try{module.exports=State_Variables}catch(e){}

/*tests*/
(function(){
  //test 1: print totals and fluxes
  (function(){
    return
    let s = new State_Variables(1,1,1,1,1,1,1,1,1,1,1);
    console.log("=== Inputs (components) (mg/L) ==="); console.log(s.components);
    console.log("=== Summary (mg/L & kg/d) ===");      console.log(s.summary);
    console.log("=== Totals (mg/L) ===");              console.log(s.totals);
    console.log("=== Fluxes (kg/d) ===");              console.log(s.fluxes);
  })();

  //test 2: combine 2 state variables and check result
  (function(){
    return
    let s1 = new State_Variables(10,2,2,2,2,2,2,2,2,2,2);
    let s2 = new State_Variables(10,1,1,1,1,1,1,1,1,1,1);
    let s3 = s1.combine(s2);
    console.log(s1.summary);
    console.log(s2.summary);
    console.log(s3.summary);
    console.log(s3.components);
  })();


  //test 3: example from george ekama (raw ww + set ww)
  (function(){
    return
    /*
    [inputs]                    [outputs]
    S_VFA_inf:         50,      Total_COD_raw:  1151,
    S_FBSO_inf:        186,     Total_C_raw:    383.4286,
    S_USO_inf:         58,      Total_TKN_raw:  90.0039,
    S_NH4_inf:         59.6,    Total_TP_raw:   20.0795,
    S_PO4_inf:         14.15,   Total_VSS_raw:  565.4983,
    X_BPO_non_set_inf: 301,     Total_TSS_raw:  665.4983,
    X_BPO_set_inf:     406,     Total_COD_set:  615,
    X_UPO_non_set_inf: 20,      Total_C_set:    205.2029,
    X_UPO_set_inf:     130,     Total_TKN_set:  71.8958,
    X_iSS_raw_inf:     100,     Total_TP_set:   16.4455,
    X_iSS_set_inf:     34,      Total_VSS_set:  211.1406,
    ............................Total_TSS_set:  245.1406 */
    //create 2 manual scenarios: (1) raw ww, (2) settled ww
    //syntax:                (Q  VFA FBS BPO UPO USO iSS NH4  OP    NOx O2 OHO PAO)
    let s=new State_Variables(25,50, 186,0,  0,  58, 0,  59.6,14.15,0,  0, 0,  0);
    console.log('---raw ww---');
    s.set("X_BPO",707);
    s.set("X_UPO",150);
    s.set("X_iSS",100);
    console.log(s.summary);

    console.log('---settled ww---');
    s.set('X_BPO',301);
    s.set('X_UPO',20);
    s.set('X_iSS',34);
    console.log(s.summary);
  })();
})();
