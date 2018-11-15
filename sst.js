//SST standalone module
function sst(){
  //example inputs
  let RAS = 0.75;  //underflow recycle ratio
  let Q   = 25;    //ML/d
  let Rs  = 15;    //d
  let Vp  = 8473.3 //m3
  let X_T = 4.5;   //kg/m3

  //equations
  let f     = (1+RAS)/RAS;    //concentrating factor
  let Qr    = Q*RAS;          //ML/d
  let X_RAS = f*X_T;          //kg/m3
  let Qw    = (Vp/Rs)/f/1000; //ML/d

  //return
  console.log({f, Qr, X_RAS, Qw});
}
sst();

{ f: 2.3333333333333335,
  Qr: 18.75,
  X_RAS: 10.5,
  Qw: 0.24209428571428568 }