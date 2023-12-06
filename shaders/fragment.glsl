 precision highp float;

                uniform vec2 u_resolution;
                uniform float u_time;
                  varying vec2 vUv;
                 varying float vDistort;
                const float PI = 3.1415926535897932384626433832795;
                const float TAU = PI * 2.;
                const float HALF_PI = PI * .5;


                vec4 permute(vec4 x)
                {
                    return mod(((x*34.0)+1.0)*x, 289.0);
                }


                vec2 fade(vec2 t) {return t*t*t*(t*(t*6.0-15.0)+10.0);}

                float cnoise(vec2 P){
                  vec4 Pi = floor(P.xyxy) + vec4(0.0, 0.0, 1.0, 1.0);
                  vec4 Pf = fract(P.xyxy) - vec4(0.0, 0.0, 1.0, 1.0);
                  Pi = mod(Pi, 289.0);
                  vec4 ix = Pi.xzxz;
                  vec4 iy = Pi.yyww;
                  vec4 fx = Pf.xzxz;
                  vec4 fy = Pf.yyww;
                  vec4 i = permute(permute(ix) + iy);
                  vec4 gx = 2.0 * fract(i * 0.0243902439) - 1.0; // 1/41 = 0.024...
                  vec4 gy = abs(gx) - 0.5;
                  vec4 tx = floor(gx + 0.5);
                  gx = gx - tx;
                  vec2 g00 = vec2(gx.x,gy.x);
                  vec2 g10 = vec2(gx.y,gy.y);
                  vec2 g01 = vec2(gx.z,gy.z);
                  vec2 g11 = vec2(gx.w,gy.w);
                  vec4 norm = 1.79284291400159 - 0.85373472095314 *
                  vec4(dot(g00, g00), dot(g01, g01), dot(g10, g10), dot(g11, g11));
                  g00 *= norm.x;
                  g01 *= norm.y;
                  g10 *= norm.z;
                  g11 *= norm.w;
                  float n00 = dot(g00, vec2(fx.x, fy.x));
                  float n10 = dot(g10, vec2(fx.y, fy.y));
                  float n01 = dot(g01, vec2(fx.z, fy.z));
                  float n11 = dot(g11, vec2(fx.w, fy.w));
                  vec2 fade_xy = fade(Pf.xy);
                  vec2 n_x = mix(vec2(n00, n01), vec2(n10, n11), fade_xy.x);
                  float n_xy = mix(n_x.x, n_x.y, fade_xy.y);
                  return 2.3 * n_xy;
                }

                vec2 rotate2D (vec2 _st, float _angle) {
                    _st -= 0.5;
                    _st =  mat2(cos(_angle),-sin(_angle),
                                sin(_angle),cos(_angle)) * _st;
                    _st += 0.5;
                    return _st;
                }

                	vec3 cosPalette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
                    return a + b * cos(6.28318 * (c * t + d));
                  }


                void main() {
                	vec2 uv = (gl_FragCoord.xy - u_resolution * 1.0) / u_resolution.yy + 0.5;

                  uv = vUv;
                  float vTime = u_time * .5 ;

                 float t = (u_time * .4) + length(uv-.5);

                   float tx = (u_time * .4) + uv.x;

                   float ty = (u_time * .4) + uv.y;

                    float distort = vDistort * .2;

                    vec3 brightness = vec3(0.5, 0.5, 0.5);
                    vec3 contrast = vec3(0.5, sin(t), 0.5);
                    vec3 oscilation = vec3(cos(t), 1.0, 1.0);
                    vec3 phase = vec3(sin(ty), 0.1, 0.2);

                    vec3 color = cosPalette(distort, brightness, contrast, oscilation, phase) * step(cnoise(uv * 20.), sin(tx));

                    gl_FragColor = vec4(vec3(color.r, color.g, color.b), 1.);
                }