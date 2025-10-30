// Tipos para as operações booleanas
export type BooleanOperation = 'unite' | 'subtract' | 'intersect' | 'exclude' | 'divide';

// Interface para formas básicas
export interface Shape {
  type: 'circle' | 'rectangle' | 'path';
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  path?: string;
}

// Interface para o resultado da operação
export interface BooleanResult {
  success: boolean;
  svgPath?: string;
  error?: string;
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

// Função para converter Element para Shape
export function convertElementToShape(element: any): Shape | null {
  switch (element.type) {
    case 'circle':
      return {
        type: 'circle',
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
        radius: element.radius || Math.min(element.width || 0, element.height || 0) / 2
      };
    
    case 'rectangle':
      return {
        type: 'rectangle',
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height
      };
    
    case 'path':
      return {
        type: 'path',
        x: element.x,
        y: element.y,
        path: element.pathData
      };
    
    default:
      return null;
  }
}

// Variável para armazenar a instância do Paper.js
let paperInstance: any = null;
let paperInitialized = false;

// Função para carregar Paper.js dinamicamente
async function loadPaper(): Promise<any> {
  if (typeof window === 'undefined') return null;
  
  if (paperInstance) return paperInstance;
  
  try {
    const paperModule = await import('paper/dist/paper-core');
    paperInstance = paperModule.default || paperModule;
    return paperInstance;
  } catch (error) {
    console.warn('Error loading Paper.js:', error);
    return null;
  }
}

// Inicializar Paper.js
async function initializePaper(): Promise<any> {
  if (typeof window === 'undefined') return null;
  
  try {
    const paper = await loadPaper();
    if (!paper) return null;
    
    if (!paperInitialized) {
      // Criar um canvas virtual para Paper.js
      const canvas = document.createElement('canvas');
      canvas.width = 1000;
      canvas.height = 1000;
      paper.setup(canvas);
      paperInitialized = true;
    }
    return paper;
  } catch (error) {
    console.warn('Error initializing Paper.js:', error);
    return null;
  }
}

// Criar um path Paper.js a partir de uma forma
async function createPaperPath(shape: Shape): Promise<any> {
  try {
    const paper = await initializePaper();
    if (!paper) return null;
    
    switch (shape.type) {
      case 'circle':
        if (shape.radius) {
          return new paper.Path.Circle({
            center: [shape.x + shape.radius, shape.y + shape.radius],
            radius: shape.radius
          });
        } else if (shape.width && shape.height) {
          // Fallback para quando radius não está definido
          const radius = Math.min(shape.width, shape.height) / 2;
          return new paper.Path.Circle({
            center: [shape.x + radius, shape.y + radius],
            radius: radius
          });
        }
        break;
      
      case 'rectangle':
        if (shape.width && shape.height) {
          return new paper.Path.Rectangle({
            point: [shape.x, shape.y],
            size: [shape.width, shape.height]
          });
        }
        break;
      
      case 'path':
        if (shape.path) {
          return new paper.Path(shape.path);
        }
        break;
    }
    return null;
  } catch (error) {
    console.error('Erro ao criar path Paper.js:', error);
    return null;
  }
}

// Executar operação booleana entre duas formas
export async function performBooleanOperation(
  shape1: Shape,
  shape2: Shape,
  operation: BooleanOperation
): Promise<BooleanResult> {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Paper.js only works in browser environment' };
  }

  try {
    const paper = await initializePaper();
    if (!paper) {
      return { success: false, error: 'Failed to initialize Paper.js' };
    }

    const path1 = await createPaperPath(shape1);
    const path2 = await createPaperPath(shape2);

    if (!path1 || !path2) {
      return { success: false, error: 'Failed to create paths' };
    }

    let result: any = null;

    switch (operation) {
      case 'unite':
        result = path1.unite(path2);
        break;
      case 'subtract':
        result = path1.subtract(path2);
        break;
      case 'intersect':
        result = path1.intersect(path2);
        break;
      case 'exclude':
        result = path1.exclude(path2);
        break;
      case 'divide':
        result = path1.divide(path2);
        break;
      default:
        return { success: false, error: 'Unknown operation' };
    }

    if (!result) {
      return { success: false, error: 'Boolean operation failed' };
    }

    const svgString = result.exportSVG({ asString: true });
    const pathData = extractPathData(svgString);

    // Calcular bounds do resultado
    const bounds = result.bounds;
    const boundsInfo = bounds ? {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height
    } : undefined;

    // Limpar paths temporários
    path1.remove();
    path2.remove();
    result.remove();

    return {
      success: true,
      svgPath: pathData || undefined,
      bounds: boundsInfo
    };

  } catch (error) {
    console.error('Erro na operação booleana:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Unir múltiplas formas (aceita tanto Elements quanto Shapes)
export async function uniteMultipleShapes(elements: any[]): Promise<BooleanResult> {
  if (elements.length === 0) {
    return { success: false, error: 'No elements provided' };
  }

  // Converter elementos para shapes
  const shapes: Shape[] = [];
  for (const element of elements) {
    const shape = convertElementToShape(element);
    if (shape) {
      shapes.push(shape);
    }
  }

  if (shapes.length === 0) {
    return { success: false, error: 'No valid shapes found' };
  }

  if (shapes.length === 1) {
    const path = await createPaperPath(shapes[0]);
    if (!path) {
      return { success: false, error: 'Failed to create path' };
    }
    const svgString = path.exportSVG({ asString: true });
    const pathData = extractPathData(svgString);
    
    // Calcular bounds
    const bounds = path.bounds;
    const boundsInfo = bounds ? {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height
    } : undefined;
    
    path.remove();
    return { success: true, svgPath: pathData || undefined, bounds: boundsInfo };
  }

  let result = await performBooleanOperation(shapes[0], shapes[1], 'unite');
  
  for (let i = 2; i < shapes.length && result.success; i++) {
    if (result.svgPath) {
      const tempShape: Shape = {
        type: 'path',
        x: 0,
        y: 0,
        path: result.svgPath
      };
      result = await performBooleanOperation(tempShape, shapes[i], 'unite');
    }
  }

  return result;
}

// Criar forma unificada para o palco (retângulo + círculo)
export async function createUnifiedStage(
  rectX: number,
  rectY: number,
  rectWidth: number,
  rectHeight: number,
  circleX: number,
  circleY: number,
  circleRadius: number
): Promise<BooleanResult> {
  const rectangle: Shape = {
    type: 'rectangle',
    x: rectX,
    y: rectY,
    width: rectWidth,
    height: rectHeight
  };

  const circle: Shape = {
    type: 'circle',
    x: circleX - circleRadius,
    y: circleY - circleRadius,
    radius: circleRadius
  };

  return await performBooleanOperation(rectangle, circle, 'unite');
}

// Extrair dados de path de uma string SVG
export function extractPathData(svgString: string): string | null {
  try {
    const pathMatch = svgString.match(/d="([^"]+)"/);
    return pathMatch ? pathMatch[1] : null;
  } catch (error) {
    console.warn('Error extracting path data:', error);
    return null;
  }
}

// Verificar se duas formas se sobrepõem
export function shapesOverlap(shape1: Shape, shape2: Shape): boolean {
  // Implementação básica para retângulos e círculos
  if (shape1.type === 'rectangle' && shape2.type === 'rectangle') {
    const rect1 = { x: shape1.x, y: shape1.y, width: shape1.width || 0, height: shape1.height || 0 };
    const rect2 = { x: shape2.x, y: shape2.y, width: shape2.width || 0, height: shape2.height || 0 };
    
    return !(rect1.x + rect1.width < rect2.x || 
             rect2.x + rect2.width < rect1.x || 
             rect1.y + rect1.height < rect2.y || 
             rect2.y + rect2.height < rect1.y);
  }
  
  if (shape1.type === 'circle' && shape2.type === 'circle') {
    const dx = shape1.x - shape2.x;
    const dy = shape1.y - shape2.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance < (shape1.radius || 0) + (shape2.radius || 0);
  }
  
  // Para outros casos, assumir que se sobrepõem
  return true;
}

// Função de fallback para criar contorno unificado sem Paper.js
export function createUnifiedStageSync(
  rectX: number,
  rectY: number,
  rectWidth: number,
  rectHeight: number,
  circleX: number,
  circleY: number,
  circleRadius: number
): string | null {
  try {
    // Implementação simplificada que retorna um path básico
    // Esta é uma versão de fallback que funciona sem Paper.js
    const rectRight = rectX + rectWidth;
    const rectBottom = rectY + rectHeight;
    
    // Verificar se o círculo está dentro do retângulo
    const circleLeft = circleX - circleRadius;
    const circleRight = circleX + circleRadius;
    const circleTop = circleY - circleRadius;
    const circleBottom = circleY + circleRadius;
    
    // Se não há sobreposição, retornar contorno do retângulo
    if (circleRight < rectX || circleLeft > rectRight || 
        circleBottom < rectY || circleTop > rectBottom) {
      return `M ${rectX} ${rectY} L ${rectRight} ${rectY} L ${rectRight} ${rectBottom} L ${rectX} ${rectBottom} Z`;
    }
    
    // Caso simples: círculo totalmente dentro do retângulo
    if (circleLeft >= rectX && circleRight <= rectRight && 
        circleTop >= rectY && circleBottom <= rectBottom) {
      return `M ${rectX} ${rectY} L ${rectRight} ${rectY} L ${rectRight} ${rectBottom} L ${rectX} ${rectBottom} Z`;
    }
    
    // Para casos complexos, retornar um path que inclui ambas as formas
    return `M ${rectX} ${rectY} L ${rectRight} ${rectY} L ${rectRight} ${rectBottom} L ${rectX} ${rectBottom} Z M ${circleX - circleRadius} ${circleY} A ${circleRadius} ${circleRadius} 0 1 1 ${circleX + circleRadius} ${circleY} A ${circleRadius} ${circleRadius} 0 1 1 ${circleX - circleRadius} ${circleY} Z`;
    
  } catch (error) {
    console.warn('Error creating unified stage sync:', error);
    return null;
  }
}

// Limpar recursos do Paper.js
export function cleanupPaper() {
  try {
    if (paperInstance && paperInstance.project) {
      paperInstance.project.clear();
    }
  } catch (error) {
    console.warn('Error cleaning up Paper.js:', error);
  }
}