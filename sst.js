
function sst(RAS){
  //inputs and default values
  RAS = isNaN(RAS) ? 1.0 : RAS; //underflow recycle ratio

  let Q   = 25;    //ML/d
  let X_T = 4.5;   //kg/m3
  let Rs  = 15;    //d
  let Vp  = 8473.3 //m3

  //calculate
  let Q_RAS = Q*RAS;                  //ML/d
  let f     = (1+RAS)/RAS;            //concentrating factor
  let X_RAS = f*X_T;                  //kg/m3
  let Qw    = (X_T*Vp/Rs)/X_RAS/1000; //ML/d

  //new state variables
  //syntax ---------> constructor(Q,  VFA, FBSO, BPO,       UPO,       USO,  iSS,       FSA, PO4, NOx)
  //let sst   = new State_Variables(Qw, 0,   0,    f*BPO_was, f*UPO_was, Suse, f*iSS_was, Nae, Pse,   0);

  console.log(Qw);
  return Qw;

}

sst();
