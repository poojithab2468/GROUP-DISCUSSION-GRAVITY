// @ts-nocheck
import { TextDecoder as FE_TextDecoder, TextEncoder as FE_TextEncoder } from 'fast-text-encoding';

const util = require('util');

if (typeof util.TextEncoder === 'undefined') {
    util.TextEncoder = FE_TextEncoder;
}
if (typeof util.TextDecoder === 'undefined') {
    util.TextDecoder = FE_TextDecoder;
}
if (typeof global.TextEncoder === 'undefined') {
    global.TextEncoder = FE_TextEncoder;
    // @ts-ignore
    global.TextDecoder = FE_TextDecoder;
}
