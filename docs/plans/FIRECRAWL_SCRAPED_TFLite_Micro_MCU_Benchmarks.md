# FIRECRAWL SCRAPED EDGE PROFILING DOC: TFLite_Micro_MCU_Benchmarks

- **Source URL:** https://www.tensorflow.org/lite/microcontrollers/build_convert
- **Scraped via:** Local Firecrawl (http://localhost:3002/v1/scrape)

---

[Skip to main content](https://www.tensorflow.org/lite/microcontrollers/build_convert#main-content)

[![Google for Developers](https://www.gstatic.com/devrel-devsite/prod/v1c5a0004de44ddd9b2d5806527078264aeb39c9a98346ca2a622cd118735d4a2/developers/images/lockup-new.svg)](https://www.tensorflow.org/)

/

*   [English](https://developers.google.com/edge/litert/microcontrollers/build_convert)
    
*   [Deutsch](https://developers.google.com/edge/litert/microcontrollers/build_convert?hl=de)
    
*   [Español](https://developers.google.com/edge/litert/microcontrollers/build_convert?hl=es)
    
*   [Français](https://developers.google.com/edge/litert/microcontrollers/build_convert?hl=fr)
    
*   [Indonesia](https://developers.google.com/edge/litert/microcontrollers/build_convert?hl=id)
    
*   [Português – Brasil](https://developers.google.com/edge/litert/microcontrollers/build_convert?hl=pt-br)
    
*   [Русский](https://developers.google.com/edge/litert/microcontrollers/build_convert?hl=ru)
    
*   [中文 – 简体](https://developers.google.com/edge/litert/microcontrollers/build_convert?hl=zh-cn)
    
*   [日本語](https://developers.google.com/edge/litert/microcontrollers/build_convert?hl=ja)
    
*   [한국어](https://developers.google.com/edge/litert/microcontrollers/build_convert?hl=ko)
    

Sign in

*   [Google AI Edge](https://developers.google.com/edge)
    

*   On this page
*   [Model conversion](https://www.tensorflow.org/lite/microcontrollers/build_convert#model_conversion)
    *   [Convert to a C array](https://www.tensorflow.org/lite/microcontrollers/build_convert#convert_to_a_c_array)
        
*   [Model architecture and training](https://www.tensorflow.org/lite/microcontrollers/build_convert#model_architecture_and_training)
    *   [Model size](https://www.tensorflow.org/lite/microcontrollers/build_convert#model_size)
        
    *   [Workload](https://www.tensorflow.org/lite/microcontrollers/build_convert#workload)
        
    *   [Operation support](https://www.tensorflow.org/lite/microcontrollers/build_convert#operation_support)
        

[**Introducing Google AI Edge Portal**](https://ai.google.dev/edge/ai-edge-portal)
: Benchmark Edge AI at scale. [Sign-up](https://docs.google.com/forms/d/e/1FAIpQLSfTcGPycQve8TLAsfH46pBlXBZe9FrgJAClwbF7DeL1LgVn4Q/viewform)
 to request access during private preview.

*   [Home](https://developers.google.com/)
    
*   [Products](https://developers.google.com/products)
    
*   [Google AI Edge](https://developers.google.com/edge)
    
*   [LiteRT](https://developers.google.com/edge/litert)
    

Send feedback

Build and convert models Stay organized with collections Save and categorize content based on your preferences.
===============================================================================================================

*   On this page
*   [Model conversion](https://www.tensorflow.org/lite/microcontrollers/build_convert#model_conversion)
    *   [Convert to a C array](https://www.tensorflow.org/lite/microcontrollers/build_convert#convert_to_a_c_array)
        
*   [Model architecture and training](https://www.tensorflow.org/lite/microcontrollers/build_convert#model_architecture_and_training)
    *   [Model size](https://www.tensorflow.org/lite/microcontrollers/build_convert#model_size)
        
    *   [Workload](https://www.tensorflow.org/lite/microcontrollers/build_convert#workload)
        
    *   [Operation support](https://www.tensorflow.org/lite/microcontrollers/build_convert#operation_support)
        

Microcontrollers have limited RAM and storage, which places constraints on the sizes of machine learning models. In addition, LiteRT for Microcontrollers currently supports a limited subset of operations, so not all model architectures are possible.

This document explains the process of converting a TensorFlow model to run on microcontrollers. It also outlines the supported operations and gives some guidance on designing and training a model to fit in limited memory.

For an end-to-end, runnable example of building and converting a model, see the [Hello World](https://github.com/tensorflow/tflite-micro/tree/main/tensorflow/lite/micro/examples/hello_world#hello-world-example)
 example.

Model conversion
----------------

To convert a trained TensorFlow model to run on microcontrollers, you should use the [LiteRT converter Python API](https://developers.google.com/edge/litert/conversion/tensorflow/overview)
. This will convert the model into a [`FlatBuffer`](https://google.github.io/flatbuffers/)
, reducing the model size, and modify it to use LiteRT operations.

To obtain the smallest possible model size, you should consider using [post-training quantization](https://developers.google.com/edge/litert/conversion/tensorflow/quantization/post_training_quantization)
.

### Convert to a C array

Many microcontroller platforms do not have native filesystem support. The easiest way to use a model from your program is to include it as a C array and compile it into your program.

The following unix command will generate a C source file that contains the LiteRT model as a `char` array:

xxd -i converted_model.tflite > model_data.cc

The output will look similar to the following:

unsigned char converted_model_tflite[] = {
      0x18, 0x00, 0x00, 0x00, 0x54, 0x46, 0x4c, 0x33, 0x00, 0x00, 0x0e, 0x00,
      // <Lines omitted>
    };
    unsigned int converted_model_tflite_len = 18200;

Once you have generated the file, you can include it in your program. It is important to change the array declaration to `const` for better memory efficiency on embedded platforms.

For an example of how to include and use a model in your program, see [`hello_world_test.cc`](https://github.com/tensorflow/tflite-micro/blob/main/tensorflow/lite/micro/examples/hello_world/hello_world_test.cc)
 in the _Hello World_ example.

Model architecture and training
-------------------------------

When designing a model for use on microcontrollers, it is important to consider the model size, workload, and the operations that are used.

### Model size

A model must be small enough to fit within your target device's memory alongside the rest of your program, both as a binary and at runtime.

To create a smaller model, you can use fewer and smaller layers in your architecture. However, small models are more likely to suffer from underfitting. This means for many problems, it makes sense to try and use the largest model that will fit in memory. However, using larger models will also lead to increased processor workload.

### Workload

The size and complexity of the model has an impact on workload. Large, complex models might result in a higher duty cycle, which means your device's processor is spending more time working and less time idle. This will increase power consumption and heat output, which might be an issue depending on your application.

### Operation support

LiteRT for Microcontrollers currently supports a limited subset of TensorFlow operations, which impacts the model architectures that it is possible to run. We are working on expanding operation support, both in terms of reference implementations and optimizations for specific architectures.

The supported operations can be seen in the file [`micro_mutable_ops_resolver.h`](https://github.com/tensorflow/tflite-micro/blob/main/tensorflow/lite/micro/micro_mutable_op_resolver.h)

Send feedback

Except as otherwise noted, the content of this page is licensed under the [Creative Commons Attribution 4.0 License](https://creativecommons.org/licenses/by/4.0/)
, and code samples are licensed under the [Apache 2.0 License](https://www.apache.org/licenses/LICENSE-2.0)
. For details, see the [Google Developers Site Policies](https://developers.google.com/site-policies)
. Java is a registered trademark of Oracle and/or its affiliates.

Last updated 2026-05-28 UTC.

Info

Chat

API