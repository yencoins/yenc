import { contract, defaultSender, provider } from "@openzeppelin/test-environment";
import TruffleConfig from "@truffle/config";

const truffleConfig = TruffleConfig.detect();

//@ts-ignore
globalThis.config ||= {
  provider: provider,
  contracts_build_directory: truffleConfig.contracts_build_directory,
  contracts_directory: truffleConfig.contracts_directory,
  from: defaultSender,
  gas: contract.defaultGas,
  gasPrice: contract.defaultGasPrice,
};
