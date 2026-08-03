# FIRECRAWL SCRAPED EDGE PROFILING DOC: Edge_Impulse_Object_Detection

- **Source URL:** https://docs.edgeimpulse.com/docs/edge-impulse-studio/learning-blocks/object-detection
- **Scraped via:** Local Firecrawl (http://localhost:3002/v1/scrape)

---

> Documentation Index
> -------------------
> 
> Fetch the complete documentation index at: [/llms.txt](https://docs.edgeimpulse.com/llms.txt)
> 
> Use this file to discover all available pages before exploring further.

[Skip to main content](https://docs.edgeimpulse.com/docs/edge-impulse-studio/learning-blocks/object-detection#content-area)

Object detection takes an image and outputs information about the class and number of objects, position, (and, eventually, size) in the image. Edge Impulse provides several object detection model architectures built into the platform, in addition to the providing the ability to use a [custom learning block](https://docs.edgeimpulse.com/studio/organizations/custom-blocks/custom-learning-blocks)
 to bring in your own architectures. The built-in options are:

*   [YOLO-Pro](https://docs.edgeimpulse.com/studio/projects/learning-blocks/blocks/object-detection/yolo-pro)
    
*   [FOMO](https://docs.edgeimpulse.com/studio/projects/learning-blocks/blocks/object-detection/fomo)
    
*   [MobileNetV2 SSD FPN](https://docs.edgeimpulse.com/studio/projects/learning-blocks/blocks/object-detection/mobilenetv2-ssd-fpn)
    

* * *

| Specification | YOLO-Pro | FOMO | MobileNetV2 SSD FPN |
| --- | --- | --- | --- |
| **Labelling method** | Bounding boxes | Bounding boxes | Bounding boxes |
| **Input image size** | Multiples of 32  <br>(square) | Any  <br>(square) | 320x320 |
| **Input image colour** | RGB | Greyscale or RGB | RGB |
| **Output format** | Bounding boxes | Centroids | Bounding boxes |
| **MCU inference** | ✅   | ✅   | ❌   |
| **CPU/GPU inference** | ✅   | ✅   | ✅   |
| **Limitations** | Stronger performance at int8 precision than float32. | Objects should have similar sizes and shapes. | Objects should be large relative to the image. |
|     |     | Objects should not be too close to each other. | Models use high compute resources (in the edge computing world). |
|     |     | Object size not available. | Input image size is fixed. |

Was this page helpful?

YesNo

[Classical ML\
\
Previous](https://docs.edgeimpulse.com/studio/projects/learning-blocks/blocks/classical-ml)
[YOLO-Pro\
\
Next](https://docs.edgeimpulse.com/studio/projects/learning-blocks/blocks/object-detection/yolo-pro)

⌘I