import React, { useRef, useEffect, useLayoutEffect, useState, useCallback } from 'react';
import { MOCK_USERS_TOP, MOCK_USERS_BOTTOM, BASE_SPEED } from './constants';
import ProfileCard from './ProfileCard';
import FxCanvas, { FxCanvasHandle } from './FxCanvas';

const WORDS = ["Coworkers", "Classmates", "Followers", "Attendees", "Members","Teammates","Strangers"];
const DISPLAY_WORDS = [...WORDS, WORDS[0]];

// ── Inline SVG Logos ──────────────────────────────────────────────────────────

const SkoolLogo: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <svg viewBox="0 0 380 124" style={style} fill="none" xmlns="http://www.w3.org/2000/svg">
    <g clipPath="url(#skool-clip)">
      <path fill="#263397" d="M58.577 55.3C57.976 56.232 57.348 56.917 56.693 57.355 56.092 57.739 55.246 57.93 54.153 57.93c-1.092 0-2.212-.274-3.359-.822-1.147-.548-2.43-1.123-3.85-1.726-1.42-.658-3.059-1.26-4.916-1.808-1.802-.548-3.905-.822-6.308-.822-3.66 0-6.5.767-8.52 2.302-2.021 1.48-3.031 3.453-3.031 5.919 0 1.699.573 3.124 1.72 4.275 1.148 1.151 2.65 2.165 4.507 3.042 1.912.822 4.069 1.617 6.472 2.384 2.403.712 4.861 1.507 7.373 2.384 2.567.877 5.052 1.891 7.455 3.042 2.403 1.151 4.533 2.603 6.39 4.357 1.912 1.699 3.441 3.781 4.588 6.248 1.147 2.411 1.72 5.343 1.72 8.796 0 4.11-.764 7.92-2.294 11.428-1.474 3.452-3.659 6.439-6.554 8.96-2.894 2.521-6.5 4.494-10.814 5.92-4.315 1.424-9.285 2.136-14.91 2.136-2.895 0-5.763-.274-8.603-.822-2.84-.493-5.543-1.206-8.11-2.137-2.567-.987-4.97-2.11-7.21-3.37-2.239-1.26-4.178-2.63-5.816-4.11l5.243-8.467c.6-.987 1.338-1.754 2.212-2.302.928-.548 2.103-.822 3.523-.822 1.365 0 2.622.356 3.769 1.069 1.147.657 2.43 1.397 3.85 2.219 1.42.767 3.086 1.507 4.998 2.22 1.966.657 4.397.986 7.291.986 2.185 0 4.07-.246 5.653-.74 1.584-.493 2.868-1.15 3.851-1.973.983-.877 1.693-1.836 2.13-2.877.491-1.096.737-2.22.737-3.37 0-1.864-.6-3.371-1.802-4.521-1.147-1.207-2.676-2.248-4.588-3.125-1.857-.877-4.014-1.672-6.472-2.384-2.458-.712-4.97-1.507-7.537-2.384-2.512-.877-5-1.919-7.455-3.125-2.403-1.205-4.56-2.712-6.472-4.52-1.857-1.864-3.386-4.138-4.588-6.824-1.147-2.685-1.72-5.946-1.72-9.782 0-3.508.683-6.823 2.048-9.947C8.165 49.654 10.213 46.859 12.944 44.448c2.731-2.411 6.118-4.33 10.16-5.755 4.096-1.424 8.82-2.137 14.173-2.137 6.008 0 11.47.987 16.385 2.96 4.916 1.973 8.957 4.55 12.125 7.728L58.577 55.3Z"/>
      <path fill="#D3513E" d="M101.158.055V69.604h3.769c1.42 0 2.54-.192 3.358-.575.82-.439 1.639-1.206 2.458-2.302l18.68-24.992c.927-1.26 1.965-2.22 3.113-2.877 1.201-.658 2.703-.987 4.506-.987h20.645L133.437 68.782c-1.911 2.576-4.123 4.604-6.636 6.084 1.256.877 2.349 1.891 3.277 3.042.929 1.15 1.83 2.439 2.703 3.863l26.134 40.859H138.6c-1.748 0-3.25-.274-4.506-.822-1.256-.603-2.294-1.644-3.113-3.124l-19.006-31.168c-.765-1.315-1.557-2.165-2.376-2.548-.82-.384-2.049-.575-3.687-.575h-4.752V122.63H78.547V.055h22.611Z"/>
      <path fill="#E0B467" d="M206.09 36.556c6.336 0 12.098 1.014 17.286 3.042 5.189 2.028 9.64 4.932 13.354 8.714 3.714 3.727 6.581 8.276 8.602 13.647 2.021 5.371 3.031 11.427 3.031 18.168 0 6.741-1.01 12.825-3.031 18.251-2.021 5.371-4.888 9.947-8.602 13.729-3.714 3.782-8.165 6.686-13.354 8.714-5.188 2.028-10.95 3.042-17.286 3.042-6.39 0-12.207-1.014-17.45-3.042-5.189-2.028-9.64-4.932-13.354-8.714-3.714-3.782-6.609-8.358-8.684-13.729-2.021-5.426-3.031-11.51-3.031-18.251 0-6.741 1.01-12.797 3.031-18.168 2.075-5.371 4.97-9.92 8.684-13.647 3.714-3.782 8.165-6.686 13.354-8.714 5.243-2.028 11.06-3.042 17.45-3.042Zm0 70.289c6.445 0 11.224-2.219 14.337-6.659 3.113-4.494 4.67-11.153 4.67-19.977 0-8.769-1.557-15.373-4.67-19.812-3.113-4.494-7.892-6.742-14.337-6.742-6.609 0-11.47 2.248-14.583 6.742-3.113 4.439-4.67 11.043-4.67 19.812 0 8.824 1.557 15.483 4.67 19.977 3.113 4.44 7.974 6.659 14.583 6.659Z"/>
      <path fill="#6BB7EE" d="M300.658 36.556c6.336 0 12.098 1.014 17.287 3.042 5.188 2.028 9.64 4.932 13.354 8.714 3.714 3.727 6.581 8.276 8.602 13.647 2.021 5.371 3.031 11.427 3.031 18.168 0 6.741-1.01 12.825-3.031 18.251-2.021 5.371-4.888 9.947-8.602 13.729-3.714 3.782-8.166 6.686-13.354 8.714-5.189 2.028-10.951 3.042-17.287 3.042-6.39 0-12.207-1.014-17.45-3.042-5.188-2.028-9.64-4.932-13.354-8.714-3.714-3.782-6.609-8.358-8.684-13.729-2.021-5.426-3.031-11.51-3.031-18.251 0-6.741 1.01-12.797 3.031-18.168 2.075-5.371 4.97-9.92 8.684-13.647 3.714-3.782 8.166-6.686 13.354-8.714 5.243-2.028 11.06-3.042 17.45-3.042Zm0 70.289c6.445 0 11.224-2.219 14.337-6.659 3.113-4.494 4.67-11.153 4.67-19.977 0-8.769-1.557-15.373-4.67-19.812-3.113-4.494-7.892-6.742-14.337-6.742-6.608 0-11.469 2.248-14.582 6.742-3.113 4.439-4.671 11.043-4.671 19.812 0 8.824 1.558 15.483 4.671 19.977 3.113 4.44 7.974 6.659 14.582 6.659Z"/>
      <path fill="#C45946" d="M379.903.055V122.63H357.291V.055h22.612Z"/>
    </g>
    <defs>
      <clipPath id="skool-clip">
        <rect fill="white" height="124" width="380"/>
      </clipPath>
    </defs>
  </svg>
);

const OmeTVLogo: React.FC<{ style?: React.CSSProperties }> = ({ style }) => (
  <svg
    viewBox="0 0 180.63173 163.07031"
    style={style}
    xmlns="http://www.w3.org/2000/svg"
  >
    <g transform="translate(19.60347,-14.888874)">
      <g transform="matrix(0.26458333,0,0,0.26458333,60.53283,87.234143)">
        <path fill="#e05e36" d="m 360.35872,-121.40635 c -12.93342,-12.85757 -28.79677,-19.48547 -47.20129,-19.48547 H 85.409735 l 99.209975,-98.6126 c 3.86864,-3.8402 5.86934,-8.61912 5.86934,-14.05229 0,-5.43318 -2.01019,-10.20261 -5.87883,-14.04282 -3.85917,-3.8402 -8.66653,-5.83141 -14.12815,-5.83141 -5.46161,0 -10.26899,1.99121 -14.13763,5.83141 l -119.207469,118.49631 -65.871318,-65.47307 c -3.868643,-3.8402 -8.66653,-5.83142 -14.13762,-5.83142 -5.471107,0 -10.268994,1.99122 -14.137637,5.83142 -3.868642,3.8402 -5.869342,8.61912 -5.869342,14.05229 0,5.43318 2.0007,10.20261 5.869342,14.0523 l 45.873811,45.59884 H -236.20955 c -18.40453,0 -34.13513,6.49516 -47.06856,19.48547 -12.93342,12.97135 -19.59925,28.483874 -19.59925,46.774613 V 250.11661 c 0,18.29074 6.53308,33.92652 19.46651,46.91683 12.93342,12.99031 28.79677,19.35272 47.2013,19.35272 h 21.5715 c 0,7.29166 2.53169,13.52131 7.7373,18.68899 5.19612,5.16769 11.46371,7.82263 18.93551,7.82263 7.32957,0 13.59716,-2.5222 18.93552,-7.82263 5.19612,-5.16768 7.73729,-11.39733 7.73729,-18.68899 H 237.4533 c 0,7.29166 2.53169,13.52131 7.87004,18.68899 5.18665,5.16769 11.45423,7.82263 18.7933,7.82263 7.33905,0 13.59715,-2.5222 18.80276,-7.82263 5.33835,-5.16768 7.87005,-11.39733 7.87005,-18.68899 h 22.37746 c 18.40453,0 34.13514,-6.49514 47.2013,-19.35272 13.0567,-12.84808 19.45703,-28.62609 19.45703,-46.91683 V -74.612777 c 0,-18.290739 -6.53309,-33.936013 -19.46652,-46.793573 z"/>
        <path fill="#ffffff" d="m 224.08371,-104.36723 c -4.26689,-1.37489 -8.79928,-2.33257 -13.87214,-3.01527 -5.06338,-0.54996 -8.53379,-0.95768 -10.40173,-1.09991 -32.66542,-2.46532 -75.2016,-4.11518 -127.343003,-5.20561 l -68.7917716,-0.82493 c -19.5992544,0 -42.4034214,0.27498 -68.5357484,0.82493 -52.274167,0.95768 -94.668097,2.74029 -127.342997,5.20561 -4.26689,0.40772 -7.7373,0.6827 -10.53448,1.09991 -4.93063,0.6827 -9.59577,1.64038 -13.72991,3.01527 -12.13694,3.69797 -22.80416,10.411213 -31.86894,20.281945 -7.06407,7.2632 -12.80067,18.907071 -17.46581,35.083334 -2.26619,8.08814 -3.86864,15.351322 -4.79788,22.064567 l -2.80666,29.0527992 c -1.86796,23.2972148 -2.79719,44.6695988 -2.79719,63.9938848 v 43.57918 c 0,19.45703 0.92923,40.69665 2.79719,63.86113 0.92923,11.64387 1.86795,21.38187 2.79718,29.18554 l 1.07146,6.43827 c 1.07147,5.34783 2.39894,10.41121 3.86865,15.48407 4.66514,16.16679 10.40173,27.82013 17.46581,35.08333 8.93203,9.59575 20.26299,16.309 34.13513,20.00698 7.4718,1.91536 16.66932,3.42299 27.60204,4.5229 18.67003,1.78262 56.00058,3.29025 112.001161,4.5229 28.000288,0.68271 54.132615,1.09991 78.4064902,1.37489 l 68.6685058,-0.82494 c 52.274163,-0.95768 94.800853,-2.74028 127.475743,-5.20559 1.86796,-0.27499 5.33837,-0.68271 10.40173,-1.23267 4.93063,-0.68269 9.60525,-1.64037 13.87214,-2.88252 12.13694,-3.69796 22.80417,-10.41121 31.86893,-20.28195 6.93133,-7.2632 12.80069,-18.90707 17.46582,-35.08333 1.33695,-5.07286 2.66443,-10.27847 3.7359,-15.48407 l 1.06199,-6.43827 c 0.92922,-7.81316 1.86794,-17.54167 2.79717,-29.18554 1.86796,-23.15499 2.79718,-44.53686 2.79718,-63.86113 V 66.1093 c 0,-19.324286 -0.92922,-40.69667 -2.79718,-63.9938848 l -2.79717,-29.0527992 c -0.92925,-6.580488 -2.53169,-13.976427 -4.79789,-22.064567 -4.66513,-16.166772 -10.53449,-27.820134 -17.46582,-35.083334 -9.33975,-9.870732 -20.00698,-16.583975 -32.1439,-20.281945 z"/>
        <polyline fill="#42a77f" points="43.045,44.522 39.881,44.522 37.659,51.72 35.395,44.522 32.147,44.522 35.958,54.53 39.319,54.53 43.045,44.522" transform="matrix(9.4819804,0,0,9.4819804,-302.87736,-273.43094)"/>
        <polygon fill="#42a77f" points="31.163,46.982 31.163,44.508 21.698,44.508 21.698,44.522 21.698,46.996 24.877,46.996 24.877,54.516 27.984,54.516 27.984,46.982" transform="matrix(9.4819804,0,0,9.4819804,-302.87736,-273.43094)"/>
        <path fill="#e05e36" d="m -78.600068,-23.19199 c -4.134156,-10.866364 -10.667229,-19.219982 -19.599254,-25.051399 -8.799288,-5.831417 -20.405228,-8.88461 -34.533378,-8.88461 -14.53588,0.132649 -26.39784,3.441955 -35.73759,9.804364 -9.33975,6.362408 -16.27107,15.114279 -20.80346,26.511617 -4.53239,11.2645812 -6.66583,24.2549121 -6.66583,39.236434 -0.13276,22.661938 4.53238,40.156189 14.13763,52.482753 9.60525,12.326583 25.07036,18.688991 46.27206,18.82173 14.27038,-0.132649 26.13235,-3.185931 35.4721,-9.406111 9.339748,-6.220179 16.271073,-14.848783 20.803464,-25.980626 4.532373,-11.131842 6.798569,-24.122155 6.798569,-38.970938 -0.009,-14.96257773 -2.010172,-27.820134 -6.144311,-38.563214 z m -24.264402,67.995267 c -2.13344,7.822644 -5.60385,14.052296 -10.40173,18.688991 -4.79787,4.503938 -11.33096,6.8934 -19.4665,7.026139 -9.738,-0.132649 -17.20031,-2.65494 -22.39644,-7.68987 -5.19612,-4.90219 -8.79928,-11.530095 -10.66723,-19.618217 -2.00069,-8.220879 -2.92993,-17.096016 -2.79718,-26.90987 0,-10.4681118 0.92923,-19.6182171 2.92993,-27.56411 2.13345,-8.08814 5.60385,-14.450549 10.40173,-19.087226 4.79788,-4.636695 11.33097,-7.026157 19.46651,-7.158896 9.73799,0.132649 17.20032,2.910964 22.39644,8.088123 5.19612,5.034929 8.79927,11.79559 10.66723,20.1492084 2.0007,8.35361793 2.797184,17.361512 2.66443,27.0426086 0.132826,10.202616 -0.79649,19.219983 -2.79719,27.033119 z"/>
        <path fill="#e05e36" d="m -36.329403,-15.369363 c -1.33697,-1.725714 -2.0007,-2.522201 -2.133457,-2.522201 l -19.201002,7.689887 c 0.132649,-0.132829 1.061983,1.3274611 2.797187,4.2384424 1.602447,2.7876967 3.337651,7.5571306 5.063383,14.1850349 1.602447,6.6279047 2.531673,15.5030417 2.797169,26.7771127 V 88.41091 H -22.74172 V 35.662662 c 0,-7.424392 1.204212,-13.7868 3.470389,-19.087226 2.266196,-5.433182 5.063383,-9.5388854 8.66653,-12.3265822 C -7.0016362,1.3284002 -3.4079618,-0.12234531 0.59341978,-0.12234531 5.1258109,0.01048347 8.330723,1.7361252 10.331423,5.0453412 12.199366,8.4872961 13.12861,13.26622 12.995853,19.230376 V 88.420401 H 37.127499 V 31.955193 c 0,-6.495147 1.336951,-12.193825 3.735903,-16.963259 2.398935,-4.769434 5.338351,-8.486375 9.064764,-11.1318425 3.470408,-2.6549579 7.064083,-3.84020756 10.799987,-3.84020756 4.532373,0.13282877 7.737285,1.85847046 9.737985,5.16768646 1.86796,3.4419549 2.797187,8.2208786 2.66443,14.1850346 V 88.429873 H 97.262213 V 17.523625 C 97.395042,6.5245217 95.261514,-2.3600878 90.994636,-8.8552353 86.594984,-15.350401 78.990438,-18.792356 68.057713,-18.925112 61.391883,-19.057761 54.991549,-17.464877 48.98945,-14.288418 42.987369,-11.235225 38.056725,-6.2002954 34.055343,0.82586164 32.320139,-5.0055553 29.257456,-9.6422503 25.123318,-13.359191 c -4.134156,-3.574694 -9.870742,-5.433165 -17.0675811,-5.565921 -7.32956024,-0.132649 -14.1376192,1.725731 -20.5379529,5.565921 -6.400352,3.8402073 -11.463717,9.93712 -15.066882,18.4234949 -0.929226,-5.03492963 -2.266195,-9.2733719 -3.868642,-12.7248171 -2.114476,-3.4704078 -3.574712,-5.9831368 -4.911663,-7.7088498"/>
        <path fill="#e05e36" d="m 191.81653,66.943713 c -3.33767,1.194722 -7.19682,2.389462 -11.87144,3.441955 -4.53239,1.194722 -9.06478,1.85847 -13.33166,1.991209 -5.60386,-0.132649 -10.0035,-1.194722 -13.19892,-3.309198 -3.33767,-2.123966 -5.86934,-5.034929 -7.47181,-8.619131 -1.60245,-3.707451 -2.53169,-7.689888 -3.06268,-12.193826 12.53519,-0.132649 23.46791,-1.991209 32.53268,-5.565921 9.19752,-3.441955 16.13834,-7.955383 21.06896,-13.654043 4.93063,-5.698679 7.46232,-12.061087 7.46232,-18.954487 0,-5.6986783 -1.20421,-10.86634679 -3.47041,-15.3702848 -2.39893,-4.5039381 -6.26758,-8.2208792 -11.46372,-10.8663462 -5.33835,-2.256724 -12.13693,-3.574712 -20.53797,-3.574712 -9.73798,0 -18.53727,2.256705 -26.13232,6.627904 -7.73731,4.3711993 -13.87215,10.9991036 -18.40454,19.6182174 -4.39963,8.4863746 -6.66583,19.0872256 -6.79857,31.8120426 0,10.468112 1.60245,19.485478 4.66513,27.175348 3.06269,7.689887 8.00279,13.7868 14.80137,18.02526 6.79859,4.238443 15.59786,6.495148 26.53058,6.495148 7.32958,-0.132649 14.00488,-0.929226 19.99751,-2.522201 5.99261,-1.592975 10.79997,-3.176459 14.40311,-4.769434 3.60317,-1.460236 5.47111,-2.389462 5.73661,-2.522219 l -6.40034,-15.247018 c -0.1233,0.123302 -1.85847,0.786997 -5.05389,1.981737 z M 144.61522,16.177184 c 1.46971,-5.565922 4.0014,-10.0698597 7.60455,-13.6540438 3.33767,-3.7074687 8.13554,-5.6986781 14.27039,-5.6986781 4.00139,0.1328288 7.19682,1.327479 9.60525,3.70745071 2.39893,2.38946209 3.60315,5.69867809 3.73589,9.93712019 0.13282,3.441955 -1.20422,6.760643 -3.73589,10.069859 -2.53169,3.441955 -6.53309,6.22967 -12.0042,8.619132 -5.60385,2.389444 -12.80067,3.84019 -21.73269,4.238442 -0.009,-5.954683 0.78699,-11.653361 2.2567,-17.219282 z"/>
        <path fill="#ffffff" d="m 303.81768,28.105513 c 0,7.291653 2.5317,13.654062 7.87005,18.688991 5.19612,5.167669 11.46371,7.822627 18.80276,7.822627 7.33905,0 13.72992,-2.522201 18.80277,-7.822627 5.19612,-5.167686 7.87004,-11.397338 7.87004,-18.688991 0,-7.291635 -2.53169,-13.654043 -7.87004,-18.6889727 -5.19612,-5.1676865 -11.46372,-7.8226443 -18.80277,-7.8226443 -7.33905,0 -13.72991,2.5222189 -18.80276,7.8226443 -5.32888,5.1676687 -7.87005,11.3973377 -7.87005,18.6889727 z"/>
        <path fill="#ffffff" d="m 311.68773,166.08729 c 5.19612,5.16769 11.46371,7.82265 18.80276,7.82265 7.33905,0 13.72992,-2.52222 18.80277,-7.82265 5.19612,-5.16767 7.87004,-11.39734 7.87004,-18.68897 0,-7.29165 -2.53169,-13.65406 -7.87004,-18.68899 -5.19612,-5.16769 -11.46372,-7.82263 -18.80277,-7.82263 -7.33905,0 -13.72991,2.5222 -18.80276,7.82263 -5.19613,5.16768 -7.87005,11.39734 -7.87005,18.68899 0,7.29163 2.54117,13.65404 7.87005,18.68897 z"/>
      </g>
    </g>
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────

const WelcomeAnimation: React.FC = () => {
  const rowTopRef = useRef<HTMLDivElement>(null);
  const rowBottomRef = useRef<HTMLDivElement>(null);
  const fxRef = useRef<FxCanvasHandle>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const [wordIndex, setWordIndex] = useState(0);
  const [isTextAnimating, setIsTextAnimating] = useState(true);
  const [wordWidths, setWordWidths] = useState<number[]>([]);
  const [wordHeight, setWordHeight] = useState<number>(0);
  const measureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const updateMeasurements = () => {
      if (measureRef.current) {
        const children = Array.from(measureRef.current.children) as HTMLElement[];
        setWordWidths(children.map(c => Math.ceil(c.getBoundingClientRect().width)));
        if (children.length > 0) {
          setWordHeight(Math.ceil(children[0].getBoundingClientRect().height));
        }
      }
    };

    updateMeasurements();
    window.addEventListener('resize', updateMeasurements);
    document.fonts?.ready.then(() => {
      updateMeasurements();
      timeoutId = setTimeout(updateMeasurements, 500);
    });

    return () => {
      window.removeEventListener('resize', updateMeasurements);
      clearTimeout(timeoutId);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setWordIndex(prev => prev < WORDS.length ? prev + 1 : prev);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (wordIndex === WORDS.length) {
      const timer = setTimeout(() => {
        setIsTextAnimating(false);
        setWordIndex(0);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            setIsTextAnimating(true);
          });
        });
      }, 550);
      return () => clearTimeout(timer);
    }
  }, [wordIndex]);

  const activeWidthIndex = wordIndex % WORDS.length;

  const stateRef = useRef({
    topOffset: 0,
    bottomOffset: 0,
    isPaused: false,
    nextMatchTime: Date.now() + 4000,
  });

  const requestRef = useRef<number>(0);

  useLayoutEffect(() => {
    const rowBottom = rowBottomRef.current;
    const container = containerRef.current;
    if (rowBottom && container) {
      let totalWidth = 0;
      Array.from(rowBottom.children).forEach(child => {
        const el = child as HTMLElement;
        const style = window.getComputedStyle(el);
        totalWidth += el.offsetWidth + parseFloat(style.marginRight || '0');
      });
      const containerWidth = container.offsetWidth;
      if (totalWidth > containerWidth) {
        stateRef.current.bottomOffset = -(totalWidth - containerWidth);
      }
      rowBottom.style.transform = `translate3d(${stateRef.current.bottomOffset}px, 0, 0)`;
    }
  }, []);

  const triggerMatch = useCallback(() => {
    const rowTop = rowTopRef.current;
    const rowBottom = rowBottomRef.current;
    if (!rowTop || !rowBottom) return;

    const getCandidates = (row: HTMLElement) =>
      Array.from(row.children).filter(c => !c.classList.contains('collapsed')) as HTMLElement[];
    const candidatesTop = getCandidates(rowTop);
    const candidatesBottom = getCandidates(rowBottom);

    if (candidatesTop.length < 8 || candidatesBottom.length < 8) {
      stateRef.current.nextMatchTime = Date.now() + 2000;
      return;
    }

    stateRef.current.isPaused = true;

    const containerRect = containerRef.current?.getBoundingClientRect();
    const centerX = containerRect ? containerRect.left + containerRect.width / 2 : window.innerWidth / 2;

    const findClosest = (candidates: HTMLElement[]) => {
      let closest: HTMLElement | null = null;
      let minDist = Infinity;
      for (const child of candidates) {
        const rect = child.getBoundingClientRect();
        const childCenter = rect.left + rect.width / 2;
        const dist = Math.abs(childCenter - centerX);
        if (dist < minDist) {
          minDist = dist;
          closest = child;
        }
      }
      return closest;
    };

    const cardTop = findClosest(candidatesTop);
    const cardBottom = findClosest(candidatesBottom);

    if (!cardTop || !cardBottom) {
      stateRef.current.isPaused = false;
      return;
    }

    const topRect = cardTop.getBoundingClientRect();
    const botRect = cardBottom.getBoundingClientRect();

    const shiftTop = centerX - (topRect.left + topRect.width / 2);
    const shiftBot = centerX - (botRect.left + botRect.width / 2);

    const targetTopOffset = stateRef.current.topOffset + shiftTop;
    const targetBottomOffset = stateRef.current.bottomOffset + shiftBot;

    rowTop.style.transition = 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)';
    rowBottom.style.transition = 'transform 0.5s cubic-bezier(0.2, 0.8, 0.2, 1)';

    rowTop.style.transform = `translate3d(${targetTopOffset}px, 0, 0)`;
    rowBottom.style.transform = `translate3d(${targetBottomOffset}px, 0, 0)`;

    stateRef.current.topOffset = targetTopOffset;
    stateRef.current.bottomOffset = targetBottomOffset;

    setTimeout(() => {
      const sharedScore = Math.floor(Math.random() * (100 - 75 + 1)) + 75;

      [cardTop, cardBottom].forEach(card => {
        card.classList.add('active-match');
        const simBar = card.querySelector('.sim-bar') as HTMLElement;
        const simText = card.querySelector('.sim-text') as HTMLElement;
        if (simBar) simBar.style.width = `${sharedScore}%`;
        if (simText) simText.innerText = `${sharedScore}%`;
      });

      if (fxRef.current) {
        const r = cardTop.getBoundingClientRect();
        const heroRect = rootRef.current?.getBoundingClientRect();
        if (heroRect) {
          fxRef.current.fire(centerX - heroRect.left, r.bottom - heroRect.top + 20);
        } else {
          fxRef.current.fire(centerX, r.bottom + 20);
        }
      }

      setTimeout(() => {
        cardTop.classList.add('popping');
        cardBottom.classList.add('popping');

        // speednet-hero: 400ms after pop starts (matches 0.4s balloonPop) → collapse + resume scroll
        setTimeout(() => {
          const setCollapseVars = (el: HTMLElement) => {
            const st = window.getComputedStyle(el);
            const w = el.offsetWidth;
            const mr = parseFloat(st.marginRight) || 0;
            el.style.setProperty('--collapse-w', `${w}px`);
            el.style.setProperty('--collapse-mr', `${mr}px`);
          };
          setCollapseVars(cardTop);
          setCollapseVars(cardBottom);
          void cardTop.offsetHeight;

          cardTop.classList.add('collapsed');
          cardBottom.classList.add('collapsed');

          rowTop.style.transition = 'none';
          rowBottom.style.transition = 'none';
          stateRef.current.isPaused = false;

          const restDelay = 10000 + Math.random() * 10000;
          stateRef.current.nextMatchTime = Date.now() + restDelay;

          setTimeout(() => {
            cardTop.classList.remove('active-match', 'popping');
            cardBottom.classList.remove('active-match', 'popping');
            const simBar = cardTop.querySelector('.sim-bar') as HTMLElement;
            if (simBar) simBar.style.width = '0%';
            const simBarB = cardBottom.querySelector('.sim-bar') as HTMLElement;
            if (simBarB) simBarB.style.width = '0%';
          }, 500);
        }, 400);
      }, 2222);
    }, 500);
  }, []);

  const animate = useCallback(() => {
    if (!stateRef.current.isPaused) {
      stateRef.current.topOffset -= BASE_SPEED;
      stateRef.current.bottomOffset += BASE_SPEED;

      const rowTop = rowTopRef.current;
      const rowBottom = rowBottomRef.current;
      const container = containerRef.current;

      const getCardSize = (el: HTMLElement) => {
        const style = window.getComputedStyle(el);
        return el.offsetWidth + parseFloat(style.marginRight);
      };

      if (rowTop && rowBottom && container) {
        const containerRect = container.getBoundingClientRect();
        const BUFFER = 800;

        const firstTop = rowTop.firstElementChild as HTMLElement;
        if (firstTop) {
          const rect = firstTop.getBoundingClientRect();
          if (rect.right < containerRect.left - BUFFER) {
            const isCollapsed = firstTop.classList.contains('collapsed');
            if (!isCollapsed) {
              stateRef.current.topOffset += getCardSize(firstTop);
            }
            rowTop.appendChild(firstTop);
            if (isCollapsed) {
              firstTop.style.transition = 'none';
              firstTop.classList.remove('collapsed');
              firstTop.style.removeProperty('--collapse-w');
              firstTop.style.removeProperty('--collapse-mr');
              void firstTop.offsetHeight;
              firstTop.style.transition = '';
            }
          }
        }

        const lastBottom = rowBottom.lastElementChild as HTMLElement;
        if (lastBottom) {
          const rect = lastBottom.getBoundingClientRect();
          if (rect.left > containerRect.right + BUFFER) {
            const isCollapsed = lastBottom.classList.contains('collapsed');
            if (!isCollapsed) {
              stateRef.current.bottomOffset -= getCardSize(lastBottom);
            }
            rowBottom.insertBefore(lastBottom, rowBottom.firstElementChild);
            if (isCollapsed) {
              lastBottom.style.transition = 'none';
              lastBottom.classList.remove('collapsed');
              lastBottom.style.removeProperty('--collapse-w');
              lastBottom.style.removeProperty('--collapse-mr');
              void lastBottom.offsetHeight;
              stateRef.current.bottomOffset -= getCardSize(lastBottom);
              lastBottom.style.transition = '';
            }
          }
        }

        rowTop.style.transform = `translate3d(${stateRef.current.topOffset}px, 0, 0)`;
        rowBottom.style.transform = `translate3d(${stateRef.current.bottomOffset}px, 0, 0)`;
      }

      if (Date.now() > stateRef.current.nextMatchTime) {
        triggerMatch();
      }
    }
    requestRef.current = requestAnimationFrame(animate);
  }, [triggerMatch]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [animate]);

  return (
    <div
      ref={rootRef}
      className="absolute inset-0 overflow-hidden flex flex-col items-center justify-center bg-slate-900"
    >
      <FxCanvas ref={fxRef} />

      {/* Background Blobs — exact colors from original code */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-[hsl(217,91%,45%)] rounded-full blur-[100px] opacity-40 animate-welcome-blob-1 mix-blend-screen" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-[hsl(282,77%,45%)] rounded-full blur-[100px] opacity-60 animate-welcome-blob-2 mix-blend-screen" />
        <div className="absolute bottom-[0%] left-[10%] w-[40vw] h-[40vw] bg-[hsl(250,80%,50%)] rounded-full blur-[120px] opacity-35 animate-welcome-blob-3 mix-blend-screen" />
        <div className="absolute top-[5%] right-[20%] w-[35vw] h-[35vw] bg-[hsl(190,80%,45%)] rounded-full blur-[120px] opacity-40 animate-welcome-blob-1 animation-delay-2000 mix-blend-screen" />
      </div>

      {/* Content — vertically centered, never scrolls */}
      <div className="relative z-20 flex flex-col items-center w-full gap-6">

        {/* ── Title & Subtitle ── */}
        <div className="text-center px-4">
          <h1 className="text-3xl lg:text-4xl xl:text-5xl font-extrabold text-white leading-tight mb-4 flex flex-col items-center justify-center">
            <div className="flex items-center gap-3 mb-2 relative">
              {/* Hidden word measurer */}
              <div
                ref={measureRef}
                className="absolute top-0 left-0 opacity-0 pointer-events-none flex flex-col items-start w-max"
                aria-hidden="true"
              >
                {WORDS.map(word => (
                  <span key={word} className="px-4 py-3 whitespace-nowrap inline-block">
                    {word}
                  </span>
                ))}
              </div>

              <span>Turn</span>
              <span
                className={`inline-block relative align-middle bg-white rounded-xl overflow-hidden shadow-lg ${isTextAnimating ? 'transition-all duration-500 ease-in-out' : ''}`}
                style={{
                  width: wordWidths[activeWidthIndex] ? `${wordWidths[activeWidthIndex]}px` : 'auto',
                  height: wordHeight ? `${wordHeight}px` : 'auto',
                }}
              >
                <span className="invisible px-4 py-1 whitespace-nowrap inline-block w-0 overflow-hidden">&nbsp;</span>
                <span
                  className={`absolute left-0 top-0 flex flex-col w-full ${wordWidths.length > 0 ? 'opacity-100' : 'opacity-0'} ${isTextAnimating ? 'transition-transform duration-500 ease-in-out' : ''}`}
                  style={{ transform: `translateY(-${wordIndex * wordHeight}px)` }}
                >
                  {DISPLAY_WORDS.map((word, i) => (
                    <span
                      key={`${word}-${i}`}
                      className="px-4 py-1 flex items-center justify-center welcome-text-gradient whitespace-nowrap"
                      style={{ height: wordHeight ? `${wordHeight}px` : 'auto' }}
                    >
                      {word}
                    </span>
                  ))}
                </span>
              </span>
            </div>
            <div>into friends!</div>
          </h1>

          <p className="text-sm lg:text-base text-slate-300 max-w-lg mx-auto leading-relaxed">
            A Real-Time Speed-Networking Platform Where Community Members Can Bond Through Random 1-on-1 Video Conversations.
          </p>
        </div>

        {/* ── Marquee ── */}
        <div
          ref={containerRef}
          className="w-full relative py-1 my-0"
          style={{
            maskImage: 'linear-gradient(to right, transparent 0%, black 100px, black calc(100% - 100px), transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 100px, black calc(100% - 100px), transparent 100%)',
          }}
        >
          {/* Center guide line 
          <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-slate-600/50 to-transparent -translate-x-1/2 pointer-events-none z-0" /> 
          */}

          {/* Top row */}
          <div className="w-full h-[clamp(6rem,10vw,14rem)] flex items-center relative overflow-visible mb-2 lg:mb-3">
            <div ref={rowTopRef} className="flex absolute left-0 will-change-transform">
              {MOCK_USERS_TOP.map((user) => (
                <ProfileCard key={user.id} user={user} />
              ))}
            </div>
          </div>

          {/* Bottom row */}
          <div className="w-full h-[clamp(6rem,10vw,14rem)] flex items-center relative overflow-visible">
            <div ref={rowBottomRef} className="flex absolute left-0 will-change-transform">
              {MOCK_USERS_BOTTOM.map((user) => (
                <ProfileCard key={user.id} user={user} />
              ))}
            </div>
          </div>
        </div>

        {/* ── Equation ── */}
        <div className="flex flex-col items-center gap-4 px-4 lg:px-12">
          <div className="flex items-center gap-3 text-slate-400 font-bold text-sm lg:text-base drop-shadow-xl">
            <div className="flex items-center justify-center rounded-lg border border-white/10 px-3 py-2" style={{ background: 'rgba(255,255,255,1)' }}>
              <SkoolLogo style={{ height: '1rem', width: 'auto', display: 'block' }} />
            </div>
            <span className="text-2xl font-bold">+</span>
            <div className="flex items-center justify-center rounded-lg border border-white/10 px-3 py-1" style={{ background: 'rgba(255,255,255,1)' }}>
              <OmeTVLogo style={{ height: '1.5rem', width: 'auto', display: 'block' }} />
            </div>
            <span className="text-2xl font-bold">=</span>
          </div>
          <div className="text-lg lg:text-2xl font-thin text-white drop-shadow-xl">
            A Never-Ending{' '}
            {/* <span className="welcome-text-gradient font-bold drop-shadow-xl">Breakout Room</span> */}
            <span className="text-white font-bold drop-shadow-xl">Breakout Room</span>
          </div>
        </div>
      </div>

      {/* Scoped styles */}
      <style>{`
        @keyframes welcome-blob-1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        @keyframes welcome-blob-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-30px, 40px) scale(1.1); }
          66% { transform: translate(20px, -30px) scale(0.95); }
        }
        @keyframes welcome-blob-3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(40px, 40px) scale(1.05); }
        }
        .animate-welcome-blob-1 { animation: welcome-blob-1 20s infinite ease-in-out; }
        .animate-welcome-blob-2 { animation: welcome-blob-2 25s infinite ease-in-out reverse; }
        .animate-welcome-blob-3 { animation: welcome-blob-3 22s infinite ease-in-out; }
        .animation-delay-2000 { animation-delay: 2s; }

        .welcome-text-gradient {
          background: linear-gradient(135deg, hsl(217, 91%, 60%), hsl(282, 77%, 61%));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          color: transparent;
        }

        /* speednet-hero balloonPop */
        @keyframes balloonPop {
          0% { transform: scale(1.0); opacity: 1; filter: brightness(1); }
          40% { transform: scale(1.1); opacity: 1; filter: brightness(1.05); }
          100% { transform: scale(0.5); opacity: 0; filter: brightness(1.2); }
        }

        /* Measured from each card via --collapse-w / --collapse-mr (same idea as speednet collapseCard) */
        @keyframes welcome-collapse-card {
          0% { width: var(--collapse-w); margin-right: var(--collapse-mr); opacity: 0; }
          100% { width: 0; margin-right: 0; opacity: 0; }
        }

        .match-card {
          transition: transform 0.4s cubic-bezier(0.2, 0.8, 0.2, 1), box-shadow 0.3s ease;
          will-change: transform, opacity, width;
          border: 1px solid #e2e8f0;
        }
        .match-card.active-match {
          z-index: 50;
          transform: scale(1.1);
          border-color: transparent;
          background-color: #4ade80;
          box-shadow: 
                0 0 0 3px #4ade80,
                0 10px 40px -10px rgba(74, 222, 128, 0.6),
                0 0 0 8px rgba(74, 222, 128, 0.12);
        }
        .match-card.active-match .match-badge {
          opacity: 1;
          transform: translateY(0);
        }
        .match-card.popping {
          animation: balloonPop 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        .match-card.collapsed {
          animation: welcome-collapse-card 0.6s ease-in-out forwards;
          pointer-events: none;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default WelcomeAnimation;
