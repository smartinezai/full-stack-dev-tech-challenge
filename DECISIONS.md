# Candidate Decisions Log

Use this document to explain your engineering choices and tradeoffs.

## 1) Viewer Architecture

- **React Three Fiber** over raw Three.js because it lets you write 3D objects (meshes, lights, controls) as React components without needing something extra to handle the canvas and or rendering.
- **`@react-three/drei`** also has builtin tools we need like the mouse control, `OrthographicCamera` to avoid distortion and `Html` for loading spinners.
- **Three.js** because it has STL/PLY loaders and math primitives like vectors and matrices.

## 2) Rendering and Interaction Decisions

- OrbitControls from @react-three/drei comes with  mouse and touch controls out of the box and works on mobile too
- Orthographic camera to avoid distortion of parallel lines
- always use transparent={true} no matter the opacity  to avoid flickering 
- `roughness=1` and `metalness=0` to make materials fully matte

## 3) Crown Placement Algorithm

- used ICP for the crown vertices to find the closest scan vertex and calculate the rotation and displacement that minimises the mean dist. between all pairs and repeat until convergence
- Tried PCA at first because I know the algorithm and seemed like I could get a rough approximation just by using the principal components but it was causing rotation issues with the crowns being upside down. Realised the task is way beyond a normal full-stack tech challenge for 72 hours and just ditched it to look for other alternatives
- The initialisation is made with Y grid search by sliding the crown to different points along the axis , running ICP at each point and picking the one who is closest to where we wanna be.
- The rotation estimation was particularly problematic so after googling and asking around I found The quaternion method and asked claude to add it inside of the ICP implementation

## 4) Handling Noisy Scan Data

- Vertex subsampling (max 5000 vertices, every Nth vertex) to avoid overrepresenting dense regions for cases with irregular tessellation
- The final ICP call to scan for vertices is done only within a local radius of the prep so things like holes or other irregularities that are far away from the prep itself shouldn't be an issue and also ICP minimises the mean distance of pairs so if there are outliers that won't be significant

## 5) Validation Strategy

Honestly, visual validation was a must since there's no ground truth also  once I realised how hard the task was I first started logging as many helpful metrics as I could (iterations, translation, mean error, centroids, etc.) before just straight up giving up on PCA and looking up online for similar implementations or even asking an LLM

## 6) Product and UX Decisions

 Per-ojbect opacity slider. Mostly used to make the crowwn semi transparent after the transformation (in the cases where the crown was placed correctly), also toggle to show and hide the individual objects. Colour coding to keep it easier to tell apart and independent object loading. Doesn't really make a difference in this case due to high speeds but for scalability, you can start inspecting a mesh while the others are still loading. Also there's the diagnostics panel with a bunch of metrics to try to debug better
 The layout is responsive and works out of the box (both for mouse and touch)

## 7) Time-Boxed Tradeoffs

No stretch goals as they depended on the core functionality working properly. The ICP implementation uses NN which is a brute force approach that takes much longer and even though the outliers are deemed insignificant due to the averaging, they're not rejected.

## 8) Known Failure Modes
Y-grid search doesn't find the right tooth reliably if the cfrown starts at the origin with an unknown orientation
ICP can converge to an adjacent tooth if the preparation error is similar to the error value of a healthy tooth
If the crown Y axis doesn't align  doesn't align with the scan Y axis it all comes crashing down. Y grid search assumes the crown is alreaedy the right side up so it only cares about moving it higher or lower but if it's not it won't help because it needs a completely different orientation first. There are some standard attemps added to the initialisation like rotating 180 along the X or Z axes but that doesn't cover every possible rotation.

## 9) Notes for Reviewers
This tech challenge is way more complex than what is to be expected from a task for a fullstack dev application process, especially given the linear algebra and ML knowledge required as well as the time constraint.