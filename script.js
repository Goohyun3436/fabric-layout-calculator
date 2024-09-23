// A사각형 크기
const A_WIDTH = 366;
const A_HEIGHT = 366;

// 사각형 정보를 저장할 배열
let rectangles = [];
let remainingAreas = [{ x: 0, y: 0, width: A_WIDTH, height: A_HEIGHT }];

const container = document.getElementById("container");
const remainingContainer = document.getElementById("remaining-container");
const addRectangleBtn = document.getElementById("add-rectangle");
const updateLayoutBtn = document.getElementById("update-layout");

// 사각형 추가하기
addRectangleBtn.addEventListener("click", () => {
  // 프로그래스바 초기화
  resetProgressBar();

  const inputContainer = document.getElementById("input-wrap");
  const newRow = document.createElement("div");
  newRow.className = "input-row";
  newRow.innerHTML = `
        <input type="number" placeholder="가로" class="rect-width">
        <input type="number" placeholder="세로" class="rect-height">
    `;
  inputContainer.appendChild(newRow);
});

// 사각형 배치 업데이트
updateLayoutBtn.addEventListener("click", () => {
  // 프로그래스바 초기화
  resetProgressBar();

  // 기존 사각형 초기화
  container.innerHTML = "";
  remainingContainer.innerHTML = "";
  rectangles = [];
  remainingAreas = [{ x: 0, y: 0, width: A_WIDTH, height: A_HEIGHT }];

  // 입력된 사각형 정보 가져오기
  const widthInputs = document.querySelectorAll(".rect-width");
  const heightInputs = document.querySelectorAll(".rect-height");

  for (let i = 0; i < widthInputs.length; i++) {
    const width = parseInt(widthInputs[i].value);
    const height = parseInt(heightInputs[i].value);

    if (width && height) {
      rectangles.push({ width, height });
      setProgressBar(i);
    }
  }

  // 모든 회전 경우의 수를 고려하여 최적의 배치 계산
  findBestLayout(rectangles).then((bestLayout) => {
    // 최적 배치 시각화
    visualizeLayout(bestLayout.placedRects);

    // 최종 필요한 원단 시각화
    visualizeResult(bestLayout.placedRects);

    // 남는 공간 표시 및 면적 표시
    visualizeRemainingAreas(bestLayout.remainingAreas);
  });
});

// 모든 회전 경우의 수를 고려하여 최적의 배치 계산
async function findBestLayout(rectangles) {
  // 가능한 모든 순열 및 회전 경우의 수를 생성
  const permutations = generateAllPermutations(rectangles);
  const totalCases = permutations.length;

  // 각 케이스의 배치 위치와 배치했을 때의 남은 공간 계산
  const cases = [];

  // 비동기적으로 각 배치를 계산하고 진행률 업데이트
  await new Promise((resolve) => {
    permutations.forEach((layout, index) => {
      setTimeout(() => {
        updateProgressBar(totalCases, index + 1);

        const { placedRects, remainingAreas } = computeLayout(layout);
        cases.push({
          placedRects: placedRects,
          remainingAreas: remainingAreas,
        });

        // 모든 경우의 수가 완료되었을 때 resolve
        if (index + 1 === totalCases) {
          resolve();
        }
      }, 0);
    });
  });

  // 우선순위: 가로 공간 최대 활용, 아래쪽 남은 공간 최대화하는 case 도출
  const bestLayout = evaluateLayout(cases);
  return bestLayout;
}

// 가능한 모든 순열 및 회전 경우의 수를 생성
function generateAllPermutations(rectangles) {
  const permutations = [];

  // 순열 생성 함수
  function permute(arr, index) {
    if (index === arr.length) {
      generateRotations([...arr]);
      return;
    }

    for (let i = index; i < arr.length; i++) {
      [arr[index], arr[i]] = [arr[i], arr[index]]; // 요소 교환
      permute(arr, index + 1);
      [arr[index], arr[i]] = [arr[i], arr[index]]; // 원상 복구
    }
  }

  // 회전 경우의 수 생성 함수
  function generateRotations(rects) {
    const rotateRectangles = (index) => {
      if (index === rects.length) {
        permutations.push([...rects]);
        setProgressBar(permutations.length);
        return;
      }

      for (let i = 0; i < 2; i++) {
        const rect = rects[index];
        const rotatedRect =
          i === 1 ? { width: rect.height, height: rect.width } : rect;
        rects[index] = rotatedRect;
        rotateRectangles(index + 1);
      }
    };
    rotateRectangles(0);
  }

  // 순열 및 회전 경우의 수 모두 고려
  permute(rectangles, 0);
  return permutations;
}

// 배치 계산
function computeLayout(rectangles) {
  // 초기 남는 공간 설정
  let remainingAreas = [{ x: 0, y: 0, width: A_WIDTH, height: A_HEIGHT }];
  const placedRects = [];

  rectangles.forEach((rect) => {
    const { width, height } = rect;
    let bestFit = null;

    // 남는 공간에서 가장 적합한 위치 찾기
    for (let i = 0; i < remainingAreas.length; i++) {
      const area = remainingAreas[i];

      if (width <= area.width && height <= area.height) {
        bestFit = { ...area, width, height };
        break;
      }
    }

    if (bestFit) {
      placedRects.push({
        width: bestFit.width,
        height: bestFit.height,
        x: bestFit.x,
        y: bestFit.y,
      });

      remainingAreas = computeRemainingAreas(
        placedRects,
        remainingAreas,
        bestFit,
        bestFit.width,
        bestFit.height
      );
    }
  });

  return { placedRects, remainingAreas };
}

// 배치 평가
function evaluateLayout(cases) {
  let bestLayout = null;
  let maxRightRemainingArea = -1;
  let maxLastRemainingArea = -1;

  cases.forEach((layout) => {
    const { placedRects, remainingAreas } = layout;

    // 아래쪽 남은 공간 최대화 계산
    const lastRemainingRect = remainingAreas[remainingAreas.length - 1]; // 마지막 요소, 아래쪽 남은 공간
    const lastRemainingArea = lastRemainingRect
      ? lastRemainingRect.width * lastRemainingRect.height
      : 0;

    // 위쪽 공간 최대 활용 계산
    const fristRemainingRect = remainingAreas[0];
    const fristRemainingX = fristRemainingRect ? fristRemainingRect.x : 0;
    let isJump = false;

    // 가로 공간 최대 활용 계산
    let totalRightRemainingArea = 0;
    remainingAreas.slice(0, -1).forEach((area) => {
      // 위쪽 빈공간 체크
      if (fristRemainingX < area.x) {
        isJump = true;
        return;
      }

      // 마지막 요소를 제외한 나머지 요소들
      const rightArea = area.width * area.height;
      totalRightRemainingArea += rightArea;
    });

    if (
      !isJump &&
      (lastRemainingArea > maxLastRemainingArea || // 아래 공간 최소 활용
        (lastRemainingArea === maxLastRemainingArea &&
          totalRightRemainingArea < maxRightRemainingArea)) // 아래 공간 면적이 같을 때 가로 공간 최대 활용
    ) {
      bestLayout = layout;
      maxRightRemainingArea = totalRightRemainingArea;
      maxLastRemainingArea = lastRemainingArea;
    }
  });

  return bestLayout;
}

// 남는 공간 계산
function computeRemainingAreas(
  placedRects,
  remainingAreas,
  placedRect,
  width,
  height
) {
  const newAreas = [];
  const { x: px, y: py } = placedRect;

  remainingAreas.forEach((area) => {
    const { x: ax, y: ay, width: aw, height: ah } = area;

    // 새로 배치된 사각형이 남은 공간의 내부에 위치하는 경우
    if (
      px >= ax &&
      px + width <= ax + aw &&
      py >= ay &&
      py + height <= ay + ah
    ) {
      const rightAreaWidth = ax + aw - (px + width);
      const bottomAreaHeight = ay + ah - (py + height);

      // 오른쪽 남는 공간
      if (rightAreaWidth > 0) {
        newAreas.push({
          x: px + width,
          y: py,
          width: rightAreaWidth,
          height: height,
        });
      }

      // 아래쪽 남는 공간
      if (bottomAreaHeight > 0) {
        newAreas.push({
          x: px,
          y: py + height,
          width: width,
          height: bottomAreaHeight,
        });
      }

      // 오른쪽 아래쪽 남는 공간
      if (rightAreaWidth > 0 && bottomAreaHeight > 0) {
        newAreas.push({
          x: px + width,
          y: py + height,
          width: rightAreaWidth,
          height: bottomAreaHeight,
        });
      }
    } else {
      // 남은 공간이 새로 배치된 사각형에 영향을 받지 않는 경우 그대로 유지
      newAreas.push(area);
    }
  });

  // 남는 공간을 y가 작은 순, x가 작은 순으로 정렬
  newAreas.sort((a, b) => {
    if (a.y !== b.y) {
      return a.y - b.y;
    }
    return a.x - b.x;
  });

  let mergedRemainingAreas = mergeBottomRemainingAreas(placedRects, newAreas);
  mergedRemainingAreas.sort((a, b) => {
    if (a.y !== b.y) {
      return a.y - b.y;
    }
    return a.x - b.x;
  });
  mergedRemainingAreas = mergeRightRemainingAreas(
    placedRects,
    mergedRemainingAreas
  );
  mergedRemainingAreas.sort((a, b) => {
    if (a.y !== b.y) {
      return a.y - b.y;
    }
    return a.x - b.x;
  });

  return mergedRemainingAreas;
}

// 아래 남는 공간 합치기
function mergeBottomRemainingAreas(placedRects, remainingAreas) {
  // 1. placedRects 중에서 y + height 값이 가장 큰 값 찾기
  const lastY = Math.max(...placedRects.map((rect) => rect.y + rect.height));

  // 2. lastY보다 y가 크거나 같은 남은 공간 필터링
  const mergeCandidates = remainingAreas.filter((area) => area.y >= lastY);

  // 3. 병합된 공간을 계산하기 위한 초기화
  if (mergeCandidates.length === 0) return remainingAreas; // 병합할 영역이 없으면 그대로 반환

  const mergedArea = {
    x: Math.min(...mergeCandidates.map((area) => area.x)),
    y: lastY, // 모든 합쳐질 영역의 y값은 lastY 이상이어야 하므로 lastY로 설정
    width:
      Math.max(...mergeCandidates.map((area) => area.x + area.width)) -
      Math.min(...mergeCandidates.map((area) => area.x)),
    height:
      Math.max(...mergeCandidates.map((area) => area.y + area.height)) - lastY,
  };

  // 4. 병합되지 않은 남은 영역과 병합된 영역을 결합
  const nonMergeAreas = remainingAreas.filter((area) => area.y < lastY);
  let mergedRemainingAreas = [...nonMergeAreas];
  mergedRemainingAreas.push(mergedArea);

  return mergedRemainingAreas;
}

// 오른쪽 남는 공간 합치기
function mergeRightRemainingAreas(placedRects, remainingAreas) {
  // 1. placedRects 중에서 y + height 값이 가장 큰 값 찾기
  const lastY = Math.max(...placedRects.map((rect) => rect.y + rect.height));

  // 2. lastY보다 작은 y값을 가진 남은 공간을 필터링 (병합 후보군 설정)
  const mergeCandidates = remainingAreas.filter((area) => area.y < lastY);

  // 병합되지 않은 영역 (병합 후보군에 속하지 않은 영역들)
  const nonMergeAreas = remainingAreas.filter((area) => area.y >= lastY);

  // 3. 병합할 후보군이 없는 경우 기존의 remainingAreas를 반환
  if (mergeCandidates.length === 0) return remainingAreas;

  // 4. 병합 후보군 중 y 값과 height 값이 같은 사각형들을 그룹화
  const mergedAreaGroups = [];

  mergeCandidates.forEach((area) => {
    // 같은 y값과 height 값을 가진 그룹을 찾음
    let groupFound = false;
    for (const group of mergedAreaGroups) {
      if (group[0].y === area.y && group[0].height === area.height) {
        group.push(area);
        groupFound = true;
        break;
      }
    }
    // 해당 그룹이 없으면 새 그룹을 생성
    if (!groupFound) {
      mergedAreaGroups.push([area]);
    }
  });

  // 5. 각 그룹을 병합하여 하나의 큰 사각형으로 만들기
  const mergedAreas = mergedAreaGroups.map((group) => {
    const minX = Math.min(...group.map((area) => area.x));
    const maxX = Math.max(...group.map((area) => area.x + area.width));
    return {
      x: minX,
      y: group[0].y, // 그룹의 모든 사각형이 y값이 같으므로 첫 번째 사각형의 y값 사용
      width: maxX - minX,
      height: group[0].height, // 그룹의 모든 사각형이 height 값이 같으므로 첫 번째 사각형의 height 값 사용
    };
  });

  // 6. 병합된 영역과 병합되지 않은 영역을 합침
  const mergedRemainingAreas = [...nonMergeAreas, ...mergedAreas];

  return mergedRemainingAreas;
}

// 최적 배치 시각화
function visualizeLayout(placedRects) {
  placedRects.forEach((rect) => {
    const newRect = document.createElement("div");
    newRect.className = "rect";
    newRect.style.width = rect.width + "px";
    newRect.style.height = rect.height + "px";
    newRect.style.left = rect.x + "px";
    newRect.style.top = rect.y + "px";
    newRect.textContent = `${rect.width}x${rect.height}`;
    container.appendChild(newRect);
  });
}

// 최종 필요한 원단 시각화
function visualizeResult(placedRects) {
  // 큰 직사각형을 계산
  const maxY = Math.max(...placedRects.map((rect) => rect.y + rect.height));

  const totalRect = {
    x: 0,
    y: 0,
    width: A_WIDTH,
    height: maxY - 0,
  };

  // 큰 직사각형을 시각화
  const newRect = document.createElement("div");
  newRect.className = "large-rect";
  newRect.style.width = totalRect.width + "px";
  newRect.style.height = totalRect.height + "px";
  newRect.style.left = totalRect.x + "px";
  newRect.style.top = totalRect.y + "px";
  newRect.textContent = `최종 원단: ${totalRect.width}x${totalRect.height}`;
  container.appendChild(newRect);
}

// 남는 공간을 표시하고 면적을 나타내는 함수
function visualizeRemainingAreas(remainingAreas) {
  totalArea = 0;
  remainingContainer.innerHTML = "";
  remainingAreas.forEach((area) => {
    if (area.x + area.width <= A_WIDTH && area.y + area.height <= A_HEIGHT) {
      const remRect = document.createElement("div");
      remRect.className = "remaining-rect";
      remRect.style.width = area.width + "px";
      remRect.style.height = area.height + "px";
      remRect.style.left = area.x + "px";
      remRect.style.top = area.y + "px";
      const remainingArea = area.width * area.height;
      remRect.textContent = `${area.width}x${area.height}\n${remainingArea}`;
      remainingContainer.appendChild(remRect);

      totalArea += remainingArea;
    }
  });
}

// 프로그래스바 세팅
function setProgressBar(totalCases) {
  const progressBarGray = document.getElementById("progress-bar-gray");
  const progressText = document.getElementById("progress-total-cases");

  // 현재 진행률 계산 (0~100%)
  const progressPercent = Math.min((1000000 / totalCases) * 100, 100).toFixed(
    2
  );

  // 프로그레스바와 텍스트 업데이트
  progressBarGray.style.width = `${progressPercent}%`;
  progressText.innerText = `배치 케이스: ${totalCases}`;
}

// 프로그래스바 업데이트
function updateProgressBar(totalCases, completedCases) {
  const progressBarGreen = document.getElementById("progress-bar-green");
  const progressText = document.getElementById("progress-text");

  // 현재 진행률 계산 (0~100%)
  const progressPercent = Number(
    Math.min((completedCases / totalCases) * 100, 100)
  );

  // 프로그레스바와 텍스트 업데이트
  progressBarGreen.style.width = `${progressPercent}%`;
  progressText.innerText = `${progressPercent}% 완료`;
}

// 프로그래스바 리셋
function resetProgressBar() {
  const progressBarGray = document.getElementById("progress-bar-gray");
  const progressBarGreen = document.getElementById("progress-bar-green");
  const progressText1 = document.getElementById("progress-total-cases");
  const progressText2 = document.getElementById("progress-text");

  // 프로그레스바와 텍스트를 초기 상태로 리셋
  progressBarGray.style.width = "0%";
  progressBarGreen.style.width = "0%";
  progressText1.innerText = "배치 케이스: 0";
  progressText2.innerText = "0% 완료";
}
