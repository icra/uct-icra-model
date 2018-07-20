/*
 * Technology: Fractionation of the influent
 * Metcalf & Eddy, Wastewater Engineering, 5th ed., 2014:
 * page 756
 *
 */

function fractionation(BOD,sBOD,COD,bCOD,sCOD,rbCOD,TSS,VSS,TKN,NH4,TP,PO4){
  /*
    | Inputs         | example values |
    |----------------+----------------+
    | BOD            |       140 g/m3 |
    | sBOD           |        70 g/m3 |
    | COD            |       300 g/m3 |
    | bCOD           |       224 g/m3 |
    | sCOD           |       132 g/m3 |
    | rbCOD          |        80 g/m3 |
    | TSS            |        70 g/m3 |
    | VSS            |        60 g/m3 |
    | TKN            |        35 g/m3 |
    | NH4            |        25 g/m3 |
    | TP             |         6 g/m3 |
    | PO4            |         5 g/m3 |
  */

  //0.ratios
  var bCOD_BOD_ratio = BOD==0 ? 0 : bCOD/BOD; //1.6 g bCOD/g BOD
  var COD_BOD_ratio  = BOD==0 ? 0 : COD/BOD;  //usually 1.9-2.0 g COD/g BOD

  //pBOD
  var pBOD = Math.max(0, BOD - sBOD); //70 g/m3

  //1. COD fractions
  var nbCOD   = Math.max(0, COD - bCOD);                 // 76 g/m3
  var nbsCODe = Math.max(0, sCOD - bCOD_BOD_ratio*sBOD); // 20 g/m3
  var nbpCOD  = Math.max(0, COD - bCOD - nbsCODe);       // 56 g/m3

  //1.2 George Ekama fractions (USO, UPO)
  var fSus = COD==0 ? 0 : 100*(nbsCODe/COD); // USO fraction (%)
  var fSup = COD==0 ? 0 : 100*(nbpCOD/COD);  // UPO fraction (%)
  /*
    George mail:
    raw nbpCOD/COD: between 8% and 25% à warning: out of range:
    if you get values outside of the range… it is likely that the COD/BOD ratio
    is wrong… normally COD/BOD we would expect for raw WW like 1.8 to 2.3; and for
    settled WW like 1.7 to 2.1; either change the total COD or the BOD so that these
    values fall within range;
    Settled à nbpCOD/totalCOD must be equal or greater than 0 and less than 10%
    Raw à nbsCOD/totalCOD from 0 to 10%
    settled à nbsCOD/totalCOD from 0 to 15%
  */

  //more COD fractions (not in M&E book)
  var pCOD  = Math.max(0, COD - sCOD);
  var bsCOD = Math.max(0, COD - pCOD - nbsCODe);
  var bpCOD = Math.max(0, COD - nbCOD - bsCOD);
  //end of COD fractions

  //TSS and VSS
  var VSS_COD = VSS     ==0 ? 0 : pCOD/VSS;       //2.8 g_pCOD/g_VSS
  var nbVSS   = VSS_COD ==0 ? 0 : nbpCOD/VSS_COD; // 20 g/m3
  var bVSS    = Math.max(0, VSS - nbVSS);         // 40 g/m3
  var iTSS    = Math.max(0, TSS - VSS);           // 10 g/m3

  //bpCOD/bVSS ratio
  var bpCOD_bVSS = bVSS==0 ? 0 : bpCOD/bVSS;      //2.8 g/m3

  //2. TKN fractions
  var ON      = Math.max(0,   TKN-NH4);               //g/m3
  var nbpON   = Math.min(TKN, 0.064*nbVSS);           //g/m3
  var nbsON   = Math.min(TKN, 0.3);                   //g/m3
  var nbON    = nbpON + nbsON;                        //g/m3
  var TKN_N2O = 0.001*TKN;                            //g/m3
  var bTKN    = Math.max(0, TKN-nbpON-nbsON-TKN_N2O); //g/m3

  //new ones (not needed)
  var bON  = ON - nbON;
  var bsON = bON*0.5; //unknown fraction TODO 50% for now (biodegradable soluble ON)
  var bpON = bON*0.5; //unknown fraction TODO 50% for now (biodegradable particl ON)
  var sON  = bsON + nbsON;
  var pON  = bpON + nbpON;

  //3. TP fractions
  var OP    = Math.max(0, TP-PO4);
  var nbpOP = Math.min(TP, 0.015*nbVSS); //g/m3
  var nbsOP = 0; //zero: seen from experience (G. Ekama)
  var nbOP  = nbsOP + nbpOP;
  var bOP   = Math.max(0, OP - nbOP); //g/m3 also bOP = aP - PO4
  var aP    = Math.max(0, TP - nbOP); //g/m3 also aP  = PO4 + bOP

  //new ones (not needed)
  var bsOP = bOP*0.5; //unknown TODO 50% for now
  var bpOP = bOP*0.5; //unknown TODO 50% for now
  var sOP  = nbsOP + bsOP;
  var pOP  = nbpOP + bpOP;

  //return results object
  return {
    //ratios
    bCOD_BOD_ratio: {value:bCOD_BOD_ratio, unit:"g_bCOD/g_BOD",   descr:"bCOD/BOD_ratio"},
    COD_BOD_ratio:  {value:COD_BOD_ratio,  unit:"g_COD/g_BOD",    descr:"COD/BOD_ratio"},
    fSus:           {value:fSus,           unit:"%",              descr:"Unbiodegradable & soluble fraction (USO/COD)"},
    fSup:           {value:fSup,           unit:"%",              descr:"Unbiodegradable & particulate fraction (UPO/COD)"},
    VSS_COD:        {value:VSS_COD,        unit:"g_pCOD/g_VSS",   descr:"pCOD/VSS ratio"},
    bpCOD_bVSS:     {value:bpCOD_bVSS,     unit:"g_bpCOD/g_bVSS", descr:"bpCOD/bVSS ratio"},

    //COD fractions lumped (s/p/b/nb)
    COD:            {value:COD,            unit:"g/m3_as_O2",   descr:"Total_COD"},
    bCOD:           {value:bCOD,           unit:"g/m3_as_O2",   descr:"Biodegradable_COD"},
    nbCOD:          {value:nbCOD,          unit:"g/m3_as_O2",   descr:"Nonbiodegradable_COD"},
    sCOD:           {value:sCOD,           unit:"g/m3_as_O2",   descr:"Soluble_COD"},
    pCOD:           {value:pCOD,           unit:"g/m3_as_O2",   descr:"Particulate_COD"},

    //COD fractions (b/nb & s/p)
    rbCOD:          {value:rbCOD,          unit:"g/m3_as_O2",   descr:"Readily_Biodegradable_soluble_COD"},
    bsCOD:          {value:bsCOD,          unit:"g/m3_as_O2",   descr:"Biodegradable_soluble_COD"},
    nbsCODe:        {value:nbsCODe,        unit:"g/m3_as_O2",   descr:"Nonbiodegradable_soluble_COD_effluent"},
    bpCOD:          {value:bpCOD,          unit:"g/m3_as_O2",   descr:"Biodegradable_particulate_COD"},
    nbpCOD:         {value:nbpCOD,         unit:"g/m3_as_O2",   descr:"Nonbiodegradable_particulate_COD"},

    //BOD fractions
    BOD:            {value:BOD,            unit:"g/m3_as_O2",   descr:"Total_BOD"},
    sBOD:           {value:sBOD,           unit:"g/m3_as_O2",   descr:"Soluble_BOD"},
    pBOD:           {value:pBOD,           unit:"g/m3_as_O2",   descr:"Particulate_BOD"},

    //suspended solids
    TSS:            {value:TSS,            unit:"g/m3",         descr:"Total Suspended Solids"},
    VSS:            {value:VSS,            unit:"g/m3",         descr:"Volatile Suspended Solids"},
    iTSS:           {value:iTSS,           unit:"g/m3",         descr:"Inert TSS"},
    nbVSS:          {value:nbVSS,          unit:"g/m3",         descr:"Nonbiodegradable_VSS"},
    bVSS:           {value:bVSS,           unit:"g/m3",         descr:"Biodegradable_VSS"},

    //Nitrogen fractions
    TKN:            {value:TKN,            unit:"g/m3_as_N",    descr:"Total Kjedahl N"},
    NH4:            {value:NH4,            unit:"g/m3_as_N",    descr:"Ammonia influent"},
    ON:             {value:ON,             unit:"g/m3_as_N",    descr:"Organic N"},
    nbON:           {value:nbON,           unit:"g/m3_as_N",    descr:"Nonbiodegradable Organic N"},
    bON:            {value:bON,            unit:"g/m3_as_N",    descr:"Biodegradable Organic N"},
    sON:            {value:sON,            unit:"g/m3_as_N",    descr:"Soluble Organic N"},
    pON:            {value:pON,            unit:"g/m3_as_N",    descr:"Particulate Organic N"},
    nbsON:          {value:nbsON,          unit:"g/m3_as_N",    descr:"Nonbiodegradable soluble Organic N"},
    nbpON:          {value:nbpON,          unit:"g/m3_as_N",    descr:"Nonbiodegradable particulate Organic N"},
    bsON:           {value:bsON,           unit:"g/m3_as_N",    descr:"Biodegradable soluble Organic N"},
    bpON:           {value:bpON,           unit:"g/m3_as_N",    descr:"Biodegradable particulate Organic N"},
    TKN_N2O:        {value:TKN_N2O,        unit:"g/m3_as_N",    descr:"TKN N2O (0.1% of TKN) only if there is nitrification"},
    bTKN:           {value:bTKN,           unit:"g/m3_as_N",    descr:"Niodegradable TKN"},

    //Phosphorus fractions
    TP:             {value:TP,             unit:"g/m3_as_P",    descr:"Total P"},
    PO4:            {value:PO4,            unit:"g/m3_as_P",    descr:"Ortophosphate influent"},
    OP:             {value:OP,             unit:"g/m3_as_P",    descr:"Organic P"},
    nbOP:           {value:nbOP,           unit:"g/m3_as_P",    descr:"Nonbiodegradable P"},
    bOP:            {value:bOP,            unit:"g/m3_as_P",    descr:"Biodegradable Organic P"},
    sOP:            {value:sOP,            unit:"g/m3_as_P",    descr:"Soluble Organic P"},
    pOP:            {value:pOP,            unit:"g/m3_as_P",    descr:"Particulate Organic P"},
    nbsOP:          {value:nbsOP,          unit:"g/m3_as_P",    descr:"Nonbiodegradable soluble OP (seen as 0 empirically)"},
    nbpOP:          {value:nbpOP,          unit:"g/m3_as_P",    descr:"Nonbiodegradable particulate P"},
    bsOP:           {value:bsOP,           unit:"g/m3_as_N",    descr:"Biodegradable soluble Organic P"},
    bpOP:           {value:bpOP,           unit:"g/m3_as_N",    descr:"Biodegradable particulate Organic P"},
    aP:             {value:aP,             unit:"g/m3_as_P",    descr:"Available P (TP - nbOP = PO4 + bOP)"},
  };
};

/*testing function*/
(function(){
  var debug=false;
  var debug=true;
  if(debug==false)return;
  var BOD     = 140;
  var sBOD    = 70;
  var COD     = 300;
  var bCOD    = 224;
  var sCOD    = 132;
  var rbCOD   = 80;
  var TSS     = 70;
  var VSS     = 60;
  var TKN     = 35;
  var NH4     = 25;
  var TP      = 6;
  var PO4     = 5;
  console.log(
    fractionation(BOD,sBOD,COD,bCOD,sCOD,rbCOD,TSS,VSS,TKN,NH4,TP,PO4)
  );
})();
